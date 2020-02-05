/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *
 * Deployed to Customer & Vendor Records that will create a Change Request 
 * if record is a Live Dealer and there are no existing Change Requests for 
 * the that record.
 */
define(['N/record','N/runtime','N/search'],
    function(record, runtime, search) {
        var currentUser = runtime.getCurrentUser();
        var fieldsChanged = [];

        /**
         * Before submitting Dealer record, check if Change Request exists
         * and if it is approved. Otherwise, block and create a Change Request
         * 
         * @param {object} context 
         */
        function saveRecord(context) {
            log.debug('saveRecord', JSON.stringify(context));
            log.debug('saveRecord', 'fieldsChanged' + JSON.stringify(fieldsChanged));
            var isLive = context.currentRecord.getValue({fieldId: 'custentity_is_live'}) || 'F';

            if (context.mode != 'edit' || context.mode != 'xedit' || isLive == 'F') {
                return true;
            }

            try {
                var dealerId = findDealer(context.currentRecord.type, context.currentRecord.id);
                var cr = lookForExistingCR(dealerId);

                if (cr && cr.status == "2") { // APPROVED
                    // set the CR to COMPLETED
                    var id = record.submitFields({
                        type: 'customrecord_change_request',
                        id: cr.id,
                        values: {
                            custrecord_cr_status: 4
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields : true
                        }
                    });

                    return true;
                } else if (cr && cr.status == 1) { // PENDING
                    alert('Save cannot be perfomed. Please have your Change Request approved.')
                } else {
                    // automatically create a Change Request
                    var newCr = record.create({
                        type: 'customrecord_change_request', 
                        isDynamic: true,
                    });

                    newCr.setValue('name', 'Request to change Live Dealer (ID:' + dealerId +  ')');
                    newCr.setValue('custrecord_cr_status', '1');
                    newCr.setValue('custrecord_dealer', dealerId);
                    newCr.setValue('custrecord_approval_policy', 1); // default policy
                    newCr.setValue('custrecord_requested_by', currentUser.id);
                    newCr.setValue('custrecord_overview', fieldsChanged.join(","));
                    var newCrId = newCr.save();
                }
            } catch (e) {
                log.audit('saveRecord', e);
            }

            return false;
        }

        /**
         * List the fields that were updated. This will be needed
         * to evaluate who is going to approve the Change Request.
         * 
         * @param {object} context 
         */
        function fieldChanged(context) {
            log.debug('fieldChanged', JSON.stringify(context));

            if (context.fieldId) {
                var oldFieldValue = search.lookupFields({
                    type: context.currentRecord.type,
                    id: context.currentRecord.id,
                    columns: [context.fieldId]
                })[context.fieldId];
                var newFieldValue = context.currentRecord.getValue({fieldId: context.fieldId});

                if (oldFieldValue != newFieldValue) {
                    fieldsChanged.push(context.fieldId);
                }
            }

            // TODO: support sublist changes
        }

        /**
         * Find the Dealer object of the Vendor or Customer
         * given the actual record ID and dealer type
         * 
         * @param {string} dealerType - Customer or Vendor
         * @param {int} recordId - Internal ID of actual record
         */
        function findDealer(dealerType, recordId) {
            var type = (dealerType.toLowerCase() == 'customer' ? 1: 2);

            var dealerSearch = search.create({
                type: 'customrecord_dealer',
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_dealer_type', 'anyof', [type]],
                    'AND',
                    ['custrecord_actual_id', 'equalto', recordId],
                ],
                columns: []
            });

            var results = dealerSearch.run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                return results[0].id;
            }

            return null;
        }

        /**
         * Search for existing Change Requests for the record
         * that was changed.
         * 
         * @param {string} dealerType - Customer or Vendor
         * @param {int} dealerId - Internal ID of actual record
         */
        function lookForExistingCR(dealerId) {
            var crSearch = search.create({
                type: 'customrecord_change_request',
                filters: [
                    ['custrecord_dealer', 'anyof', [dealerId]], // Customer or Vendor
                    'AND',
                    ['custrecord_requested_by', 'anyof', [currentUser.id]],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['custrecord_cr_status']
            });

            var results = crSearch.run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                return {id: results[0].id, status: results[0].getValue({fieldId: 'custrecord_cr_status'})};
            }

            return null;
        }

        return {
            saveRecord: saveRecord,
            fieldChanged: fieldChanged
        };
    }
);