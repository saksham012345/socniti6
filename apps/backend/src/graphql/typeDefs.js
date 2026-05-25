const { gql } = require("graphql-tag");

const typeDefs = gql`
  type User {
    id: ID!
    fullName: String!
    username: String!
    email: String
    phone: String
    role: String!
    bio: String
    location: String
    avatarUrl: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Coordinates {
    lat: Float!
    lng: Float!
  }

  type DonationNeed {
    item: String!
    quantity: Int!
    fulfilled: Int!
  }

  type Participant {
    userId: ID!
    fullName: String
    email: String
    phone: String
    note: String
    joinedAt: String!
  }

  type Event {
    id: ID!
    title: String!
    slug: String!
    description: String!
    category: String!
    imageUrl: String
    paymentQr: String
    organizerId: ID!
    organizerName: String
    locationName: String!
    address: String
    city: String
    state: String
    coordinates: Coordinates!
    startsAt: String!
    endsAt: String
    maxParticipants: Int!
    currentParticipants: Int!
    waitlistCount: Int!
    status: String!
    donationNeeds: [DonationNeed!]
    participants: [Participant!]
    waitlist: [Participant!]
    averageRating: Float
    totalReviews: Int
    distanceKm: Float
    createdAt: String!
  }

  type EventListResponse {
    events: [Event!]!
    filters: EventFilters!
  }

  type EventFilters {
    categories: [String!]!
  }

  type EventMutationResponse {
    success: Boolean!
    message: String!
    event: Event
  }

  type OrganizerAnalytics {
    totalEvents: Int!
    totalParticipants: Int!
    totalWaitlist: Int!
  }

  type OrganizerDashboard {
    analytics: OrganizerAnalytics!
    events: [Event!]!
  }

  type Donation {
    id: ID!
    eventId: ID!
    donorId: ID!
    donorName: String!
    amount: Float
    item: String
    quantity: Int
    type: String!
    status: String!
    message: String
    createdAt: String!
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

  type Message {
    id: ID!
    eventId: ID!
    senderId: ID!
    senderName: String!
    content: String!
    type: String!
    createdAt: String!
  }

  input CoordinatesInput {
    lat: Float!
    lng: Float!
  }

  input DonationNeedInput {
    item: String!
    quantity: Int!
    fulfilled: Int
  }

  input CreateEventInput {
    title: String!
    description: String!
    category: String!
    imageUrl: String
    paymentQr: String
    organizerName: String
    locationName: String!
    address: String
    city: String
    state: String
    coordinates: CoordinatesInput!
    startsAt: String!
    endsAt: String
    maxParticipants: Int
    donationNeeds: [DonationNeedInput!]
  }

  input UpdateEventInput {
    title: String
    description: String
    category: String
    imageUrl: String
    paymentQr: String
    locationName: String
    address: String
    city: String
    state: String
    coordinates: CoordinatesInput
    startsAt: String
    endsAt: String
    maxParticipants: Int
    status: String
    donationNeeds: [DonationNeedInput!]
  }

  input RegisterForEventInput {
    fullName: String
    email: String
    phone: String
    note: String
  }

  input CreateDonationInput {
    eventId: ID!
    amount: Float
    item: String
    quantity: Int
    type: String!
    message: String
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User]
    events(search: String, category: String, city: String, status: String, date: String, lat: Float, lng: Float, maxDistanceKm: Float, organizerId: ID): EventListResponse!
    event(slug: String!): Event
    organizerDashboard: OrganizerDashboard!
    eventDonations(eventId: ID!): DonationResponse!
    myDonations: [Donation!]!
    eventMessages(eventId: ID!, limit: Int): [Message!]!
  }

  type Mutation {
    signup(fullName: String!, username: String!, email: String!, password: String!, role: String): AuthPayload!
    login(username: String!, password: String!): AuthPayload!
    register(fullName: String!, email: String!, password: String!, role: String): AuthPayload!
    createEvent(input: CreateEventInput!): EventMutationResponse!
    updateEvent(slug: String!, input: UpdateEventInput!): EventMutationResponse!
    deleteEvent(slug: String!): EventMutationResponse!
    registerForEvent(slug: String!, input: RegisterForEventInput): EventMutationResponse!
    cancelRegistration(slug: String!): EventMutationResponse!
    createDonation(input: CreateDonationInput!): Donation!
  }
`;

module.exports = typeDefs;
