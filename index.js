/**
 * Plugin for Baucis to configure read/write access on per-attribute level.
 *
 * @package baucis-access
 * @author Pavel Karoukin <pavel@karoukin.us>
 */

var baucis = require('baucis');
var deepExtend = require('deep-extend');

// Example of settings up baucis-access plugin:
//
// > var controller = baucis.rest('model');
// > 
// > controller.access({
// >     roles: {
// >        anonymous: {
// >            read: true
// >        }
// >     }
// > });
//
// Following options are available:
//
var access = module.exports = function(controller) {
    return {
        // **writeException** - set to **false** to NOT throw an exception
        // when client tries to write attributes not allowed for current role and
        // silently ignore these
        writeException: true,

        // **getCustomRole** - allows you to define custom roles outside of standard
        // 'anonymous', 'authenticated', 'owner'. Should return new array of roles.
        //
        // > **req** - Express's request object
        // > **roles** - current list of roles
        getCustomRole: function(req, roles) {
            return roles;
        },

        // **getRoles** - Allows you to override function used to get current user roles
        getRoles: function(req) {
            var roles = [];

            if (! req.user) {
                roles.push('anonymous');
            }
            else {
                roles.push('authenticated');
            }

            if (access.getCustomRole) {
                roles = this.getCustomRole.apply(controller, [req, roles]);
            }

            return roles;
        },

        // **modelUserId** - Name of the model's attribute where user_id is stored. Defaults to **user_id**.
        modelUserId: 'user_id',

        // **requestUserId** - Name of attribute inside *req.user* object with currently logged in user_id. Defauls to **_id**.
        requestUserId: '_id',

        // **roles** - Rules based on role and create/write/read operation. Last rule have precedence over
        // rules above. I.e. if user have both 'authenticated' and 'owner' roles, settings for
        // 'owner' role will prevail.
        roles: {
            defaults: {
                create: false,
                read  : false,
                write : false,
                drop  : false
            },
            anonymous: {
                create: false,
                write : false,
                read  : false,
                drop  : false
            },
            authenticated: {
                create: true,
                read  : true,
                write : false,
                drop  : false
            },
            owner: {
                read  : true,
                write : true,
                drop  : true
            }
        },

        // **getRules** - returns rules based on roles.
        getRules: function(roles) {
            var that = this;
            var rules = this.roles.defaults;

            roles.forEach(function(role) {
                rules = deepExtend(rules, that.roles[role]);
            });

            return rules;
        },

        // **getCurrentRules** - returns rules for current user.
        getCurrentRules: function(req, model, create) {
            var roles = this.getRoles(req);

            if (create) {
                roles.push('owner');
            }

            if (model && roles.indexOf('owner') == -1 && req.user && this.modelUserId && this.requestUserId) {
                var model_user_id = model[this.modelUserId] + "";
                var req_user_id = req.user[this.requestUserId] + "";

                if (model_user_id && req_user_id && model_user_id == req_user_id) {
                    roles.push('owner');
                }
            }

            return this.getRules(roles);
        }
    };
};


baucis.Controller.decorators(function (model, protect) {
    var controller = this;

    protect.property('access', new access(controller), function(options) {
        return deepExtend({ enabled: true }, new access(controller), options);
    });

    controller.request('delete', function(req, res, next) {
        if (! controller.access().enabled) {
            return next();
        }

        var model = controller.model();

        model.findOne(req.baucis.conditions, function(err, doc) {
            if (err) {
                return res.send(500);
            }

            var rules = controller.access().getCurrentRules(req, doc.toObject());

            if (! rules.drop) {
                res.status(403).send(baucis.Error.Forbidden('Deleting this document is prohibited.'));
                return;
            }

            next();
        });
    });

    // Make sure creation of new records allowed for current role.
    controller.request('post', function(req, res, next) {
        if (! controller.access().enabled) {
            return next();
        }

        var rules = controller.access().getCurrentRules(req);

        if (! rules.create) {
            return res.status(403).send(baucis.Error.Forbidden('Creating this type of documents is prohibited.'));
        }
        else {
            next();
        }
    });

    controller.request('put post', function(req, res, next) {
        if (! controller.access().enabled) {
            return next();
        }

        var error = false;

        req.baucis.incoming(function(ctx, cb) {
            if (error) {
                return;
            }

            var doc = ctx.doc;
            var newDoc = ctx.incoming;

            var rules = controller.access().getCurrentRules(req, doc, (req.method == 'POST'));

            if (rules.write === true) {
                return cb(null, ctx);
            }

            if (rules.write === false) {
                res.status(403).send(baucis.Error.Forbidden('Writing to this document is prohibited.'));
                error = true;
                return;
            }

            var allowedFields = rules.write;

            if (! Array.isArray(allowedFields)) {
                allowedFields = allowedFields.split(/\s+/);
            }

            Object.keys(newDoc).forEach(function(attr) {
                if (allowedFields.indexOf(attr) === -1) {
                    if (controller.access().writeException) {
                        res.status(403).send(baucis.Error.Forbidden('Attempt to update read-only field.'));
                        error = true;
                        return;
                    }
                    delete newDoc[attr];
                }
            });

            cb(null, ctx);
        });

        next();
    });

    controller.request(function(req, res, next) {
        if (! controller.access().enabled) {
            return next();
        }

        req.baucis.outgoing(function(ctx, cb) {
            var doc = ctx.doc.toObject();

            if (! doc) {
                return cb(null, ctx);
            }

            var rules = controller.access().getCurrentRules(req, doc);

            if (rules.read === false) {
                ctx.doc = undefined;
                return cb(null, ctx);
            }

            if (rules.read === true) {
                return cb(null, ctx);
            }

            var allowedFields = rules.read;

            if (! Array.isArray(allowedFields)) {
                allowedFields = allowedFields.split(/\s+/);
            }

            Object.keys(doc).forEach(function(attr) {
                if (allowedFields.indexOf(attr) === -1) {
                    ctx.doc[attr] = null;
                }
            });

            return cb(null, ctx);
        });

        next();
    });

});
