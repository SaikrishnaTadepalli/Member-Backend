const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Org {
        _id: ID!
        name: String!
        tiers: [String!]!
        creator: User!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        createdOrgs: [Org!]
    }

    type Membership {
        _id: ID!
        org: Org!
        user: User!
        tierIndex: Int!
        createdAt: String!
        updatedAt: String!
    }

    input OrgInput {
        name: String!
        tiers: [String!]!
    }

    input UserInput {
        name: String!
        email: String!
        password: String!
    }

    input MembershipInput {
        orgId: ID!
        tierIndex: Int!
    }

    type RootQuery {
        orgs: [Org!]!
        memberships: [Membership!]!
    }

    type RootMutation {
        createOrg(orgInput: OrgInput!): Org
        createUser(userInput: UserInput!): User
        addMembership(membershipInput: MembershipInput!): Membership!
        removeMembership(membershipId: ID!): Org!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)