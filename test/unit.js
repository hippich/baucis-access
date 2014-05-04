/* global describe, it */
var baucis = require('baucis'),
    access = require('../index'),
    should = require('should');

var controller = baucis.rest('test');

describe('baucis-access', function() {
    var ac = new access(controller);

    it('should have roles set to ["anonymous"] when req.user is not set', function() {
        ac.getRoles({}).should.containEql("anonymous");
        ac.getRoles({}).should.not.containEql("authenticated");
    });

    it('should have roles set to ["authenticated"] when req.user is set', function() {
        ac.getRoles({ user: 'authenticated' }).should.containEql("authenticated");
        ac.getRoles({ user: 'authenticated' }).should.not.containEql("anonymous");
    });

    it('when user is owner of the document, he should have write and drop access', function() {
        var req = {
            user: {
                _id: 'authenticated'
            }
        };

        var doc = {
            user_id: 'authenticated'
        };

        var rules = ac.getCurrentRules(req, doc);

        should(rules.write).ok;
        should(rules.drop).ok;
    });

    it('when user is NOT owner of the document, he should NOT have write and drop access', function() {
        var req = {
            user: {
                _id: 'authenticated'
            }
        };

        var doc = {
            user_id: 'other'
        };

        var rules = ac.getCurrentRules(req, doc);

        should(rules.write).not.ok;
        should(rules.drop).not.ok;
    });
});

controller.access({
});

describe('baucis-access and baucis integration', function() {
    it('access plugin should be enabled', function() {
        should(controller.access().enabled).ok;
    });
});
