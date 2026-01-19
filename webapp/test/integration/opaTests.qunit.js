sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'cyclecountingimoverplus/test/integration/FirstJourney',
		'cyclecountingimoverplus/test/integration/pages/overplusMain'
    ],
    function(JourneyRunner, opaJourney, overplusMain) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('cyclecountingimoverplus') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheoverplusMain: overplusMain
                }
            },
            opaJourney.run
        );
    }
);