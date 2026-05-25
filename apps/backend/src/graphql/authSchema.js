const gql = require("graphql-tag");

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type User @key(fields: "id") {
    id: ID!
    fullName: String!
    username: String!
    email: String
    phone: String
    role: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    signup(fullName: String!, username: String!, email: String!, password: String!, role: String): AuthPayload!

    # Login with username and password
    login(username: String!, password: String!): AuthPayload!

    # Legacy support
    register(fullName: String!, email: String!, password: String!, role: String): AuthPayload!
  }
`;

module.exports = typeDefs;
