const Org = require('../../models/org');
const User = require("../../models/user");
const Membership = require("../../models/membership");

const userResolver = require('./user');

const { transformOrg } = require('./merge');
const { parseJWT } = require('../../utils/parse');

module.exports = {
    orgs: async () => {
        try {
            const orgs = await Org.find();

            return orgs.map((org) => transformOrg(org));
        } catch (err) {
            throw err
        }
    },

    orgById: async (args) => {
        try {
            const org = await Org.findById(args.orgId);

            if (!org) {
                throw new Error('Org does not exist.')
            }

            return transformOrg(org);
        } catch (err) {
            throw err
        }
    },

    orgAdmins: async (args) => {
        try {
            const org = await Org.findById(args.orgId);

            if (!org) {
                throw new Error('Org does not exist.')
            }

            // Get all Memberships for current orgs that are also Admins
            const fetchedMemberships = await Membership.find({ org: args.orgId, isAdmin: true });

            const userIds = fetchedMemberships.map((membership) => membership.user._id.toString());
            const uniqueUserIds = [...new Set(userIds)]

            return uniqueUserIds.map(async (userId) => {
                return await userResolver.userById({ userId: userId })
            });
        } catch(err) {
            throw err
        }
    },

    createOrg: async (args, req) => {
        if (!req.isAuth) {
            throw new Error('Unauthenticated');
        }

        const org = new Org({
            name: args.orgInput.name,
            tiers: args.orgInput.tiers,
            creator: req.userId
        });

        try {
            const orgSaveRes = await org.save();
            const createdOrg = transformOrg(orgSaveRes);
            const curUser = await User.findById(req.userId);
    
            if (!curUser) {
                throw new Error("User doesn't exist"); 
            }
    
            curUser.createdOrgs.push(org);
            await curUser.save();
    
            return createdOrg;
        } catch (err) {
            throw err;
        }
    },

    updateOrg: async (args, req) => {
        if (!req.isAuth) {
            throw new Error('Unauthenticated');
        }

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]

        const jwtPayload = parseJWT(token);

        try {
            const curOrg = await Org.findById(args.orgId);

            if (!curOrg) {
                throw new Error("Org does not exist");
            }

            // Making sure that a request is being sent from authorized user
            const isCreator = (curOrg.creator._id.toString() === jwtPayload.userId);
            const isAdmin = await Membership.findOne({ org: args.orgId, isAdmin: true, user: jwtPayload.userId});
            
            if (!(isCreator || isAdmin)) {
                throw new Error("Permission invalid.");
            }

            // Execute request
            const orgUpdateRes = 
                await Org.findByIdAndUpdate(
                    args.orgId, 
                    { 
                        name: args.orgInput.name, 
                        tiers: args.orgInput.tiers
                    },
                    { new: true }
                )

            return transformOrg(orgUpdateRes);
        } catch (err) {
            throw err;
        }
    },

    deleteOrg: async (args, req) => {
        if (!req.isAuth) {
            throw new Error('Unauthenticated');
        }

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]

        const jwtPayload = parseJWT(token);

        try {
            const org = await Org.findById(args.orgId).populate('creator');

            if (!org) {
                throw new Error("Org does not exist");
            }

            // Making sure that a request is being sent from authorized user
            const isCreator = (org.creator._id.toString() === jwtPayload.userId);
            const isAdmin = await Membership.findOne({ org: args.orgId, isAdmin: true, user: jwtPayload.userId});
            
            if (!(isCreator || isAdmin)) {
                throw new Error("Permission invalid.");
            }

            // Execute request
            await User.updateOne(
                { _id: org.creator._id },
                { $pull: { createdOrgs: args.orgId } }
            )
            
            await Membership.deleteMany({ org: { _id: args.orgId } })

            await org.deleteOne({ _id: args.orgId })

            return transformOrg(org);
        } catch (err) {
            throw err;
        }
    }
}