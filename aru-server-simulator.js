if (Meteor.isServer) {
  var meteorAppUrl = Meteor.settings.mdisc.url;
  var client = DDP.connect(meteorAppUrl);
  DDP.loginWithPassword(client, {email: Meteor.settings.mdisc.user}, Meteor.settings.mdisc.pass);
  Job.setDDP(client);
  var workers = Job.processJobs('md_jobs', 'recordArchiveOnARU-' + Meteor.settings.mdisc.server, {concurrency: Meteor.settings.mdisc.concurrency},
    function (job, cb) {
      console.log('Starting: ' + job.data.archiveId);

      // get archive
      var archive = client.call('getArchiveById', job.data.archiveId);
      if (!archive) {
        console.log('No Archive: ' + job.data.archiveId);
        job.fail('No Archive: ' + job.data.archiveId);
        cb();
        return;
      }

      var steps = 100;
      var step = 0;

      // Set job status
      client.call('setArchiveStatus', 'Recording', job.data.archiveId);
      job.progress(++step,steps);

      var nas = client.call('getNasById', archive.nasId);

      continueJob(job, cb, step, steps);
    }
  );

  function continueJob(job, cb, step, steps) {
    job.progress(++step,steps);
    if (step < steps) {
      Meteor.setTimeout(function () {
        continueJob(job, cb, step, steps);
      }, 1000);
    } else {
      console.log('Done: ' + job.data.archiveId);
      job.done("Done");
    }
  }
}
