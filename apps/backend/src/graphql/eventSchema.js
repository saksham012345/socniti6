const gql = require("graphql-tag");

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Event @key(fields: "id") {
    id: ID!
    title: String!
    slug: String!
    description: String!
    category: String!
    imageUrl: String
    organizerId: ID!
    organizer: User
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
    status: EventStatus!
    donationNeeds: [DonationNeed!]
    participants: [Participant!]
    waitlist: [Participant!]
    averageRating: Float
    totalReviews: Int
    distanceKm: Float
    createdAt: String!
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
    user: User
    fullName: String
    email: String
    joinedAt: String!
  }

  enum EventStatus {
    upcoming
    ongoing
    completed
    cancelled
  }

  type EventFilters {
    categories: [String!]!
  }

  type EventListResponse {
    events: [Event!]!
    filters: EventFilters!
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

  type EventMutationResponse {
    success: Boolean!
    message: String!
    event: Event
  }

  # Reference to User from Auth Service
  type User @key(fields: "id", resolvable: false) {
    id: ID!
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
    locationName: String
    address: String
    city: String
    state: String
    coordinates: CoordinatesInput
    startsAt: String
    endsAt: String
    maxParticipants: Int
    status: EventStatus
    donationNeeds: [DonationNeedInput!]
  }

  input RegisterForEventInput {
    fullName: String
    email: String
  }

  type Query {
    events(
      search: String
      category: String
      city: String
      status: EventStatus
      date: String
      lat: Float
      lng: Float
      maxDistanceKm: Float
      organizerId: ID
    ): EventListResponse!
    
    event(slug: String!): Event
    
    organizerDashboard: OrganizerDashboard!
  }

  type Mutation {
    createEvent(input: CreateEventInput!): EventMutationResponse!
    
    updateEvent(slug: String!, input: UpdateEventInput!): EventMutationResponse!
    
    deleteEvent(slug: String!): EventMutationResponse!
    
    registerForEvent(slug: String!, input: RegisterForEventInput): EventMutationResponse!
    
    cancelRegistration(slug: String!): EventMutationResponse!
  }
`;

module.exports = typeDefs;
