const { gql } = require('apollo-server-express')
// import getAssets, { AssetSheet } from './AssetBase'

export const typeDefs = gql`
  type Attachment {
    filename: String
  }

  type Icon {
    name: String
    author: String
    assets: [Attachment]
  }

  type Query {
    Icons: [Icon]
  }
`

export const resolvers = {
  Query: {
    Icons: () => [{ name: 'Test' }],
    // Illustrations: async () => getAssets(AssetSheet.Illustrations),
  },
}
