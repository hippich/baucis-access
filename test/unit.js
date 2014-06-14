/* global describe, it */
var mongoose = require('mongoose');
var should = require('should');
var baucis = require('baucis');
var access = require('../index');

var Schema = mongoose.Schema;

var schema = new Schema({
    uid: { type: Schema.ObjectId, index: true },
    code: { type: String, index: { unique: true } },
    createdAt: { type: Date, 'default': Date.now },
    lastUpdate: { type: Date, 'default': Date.now }
});

var model = mongoose.model('test', schema);

model.lastModified('lastUpdate');

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
