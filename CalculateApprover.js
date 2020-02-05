/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *
 * Deployed to Change Request records. Depending on the fields changed under 
 * "Overview of Changes", determine who should be the approver using
 * Approval Policy record
 */
define(['N/record','N/runtime','N/search'],
    function(record, runtime, search) {
        function saveRecord(context) {
            /**
             * CALCULATE WHO SHOULD BE APPROVER
             * 
             * 1. Get the Overview of Changes
             * 2. Crosscheck Approval Policy with the fields changed
             * The result of this part should be either it's Sales or 
             * or Finance
             * 3. If Sales, get the value from Sales Approver. Otherwise, 
             * get the value from Finance Approver of the Approval
             * Policy Record linked to this Change Request.
             * 4. Set Approver field with value taken from #3.
             * 
             */
        }

        return {
            saveRecord: saveRecord
        };
    }
);