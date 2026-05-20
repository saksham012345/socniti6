
const { mergeTypeDefs, mergeResolvers } = require("@graphql-tools/merge");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { parse } = require("graphql");

const authTypeDefs = require("./authSchema.js");
const authResolvers = require("./authResolvers.js");

let eventTypeDefs = "";
let eventResolvers = {};
try {
  eventTypeDefs = require("./eventSchema.js");
  eventResolvers = require("./eventResolvers.js");
} catch(e) {}

const chatTypeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Message @key(fields: "id") {
    id: ID!
    eventId: ID!
    senderId: ID!
    sender: User
    senderName: String!
    content: String!
    type: MessageType!
    createdAt: String!
  }

  enum MessageType {
    text
    system
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    eventMessages(eventId: ID!, limit: Int): [Message!]!
    _chatPing: String
  }
`);
const chatResolvers = {};

const donTypeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Donation @key(fields: "id") {
    id: ID!
    eventId: ID!
    donorId: ID!
    donor: User
    donorName: String!
    amount: Float
    item: String
    quantity: Int
    type: DonationType!
    status: DonationStatus!
    message: String
    createdAt: String!
  }

  enum DonationType {
    monetary
    item
  }

  enum DonationStatus {
    pending
    completed
    cancelled
  }

  type DonationStats {
    totalMonetary: Float!
    totalItems: Int!
    totalDonations: Int!
  }

  type DonationResponse {
    donations: [Donation!]!
    stats: DonationStats!
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  input CreateDonationInput {
    eventId: ID!
    amount: Float
    item: String
    quantity: Int
    type: DonationType!
    message: String
  }

  type Query {
    eventDonations(eventId: ID!): DonationResponse!
    myDonations: [Donation!]!
    _donationPing: String
  }

  type Mutation {
    createDonation(input: CreateDonationInput!): Donation!
  }
`);
const donResolvers = {};

const federationDirectives = parse(`
  directive @key(fields: String!, resolvable: Boolean) on OBJECT | INTERFACE
  directive @link(url: String, import: [String]) on SCHEMA
  directive @shareable on FIELD_DEFINITION | OBJECT
`);

const typeDefs = mergeTypeDefs([
  federationDirectives,
  authTypeDefs,
  eventTypeDefs || "type Query { _eventPing: String }",
  chatTypeDefs,
  donTypeDefs
]);

const resolvers = mergeResolvers([
  authResolvers,
  eventResolvers || {},
  chatResolvers,
  donResolvers
]);

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema };
