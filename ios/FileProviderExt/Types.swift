//
//  Types.swift
//  FileProviderExt
//
//  Created by Jan Lenczyk on 02.10.23.
//

struct FetchFolderContentsFile: Decodable {
  var uuid: String
  var metadata: String
  var rm: String
  var timestamp: Int
  var chunks: Int
  var size: Int
  var bucket: String
  var region: String
  var parent: String
  var version: Int
  var favorited: Int
}

struct FetchFolderContentsFolder: Decodable {
  var uuid: String
  var name: String
  var parent: String
  var color: String?
  var timestamp: Int
  var favorited: Int
  var is_sync: Int?
  var is_default: Int?
}

struct FetchFolderContentsData: Decodable {
  var uploads: [FetchFolderContentsFile]
  var folders: [FetchFolderContentsFolder]
}

struct FetchFolderContents: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: FetchFolderContentsData?
}

struct CreateFolderData: Decodable {
  var uuid: String
}

struct CreateFolder: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: CreateFolderData?
}

struct BaseAPIResponse: Decodable {
  var status: Bool
  var code: String
  var message: String
}

struct APIError: Error {
  var code: String
  var message: String
}

enum ItemType {
  case file
  case folder
}

struct Item {
  var uuid: String
  var parent: String
  var name: String
  var type: ItemType
  var mime: String
  var size: Int
  var timestamp: Int
  var lastModified: Int
  var key: String
  var chunks: Int
  var region: String
  var bucket: String
  var version: Int
}

struct ItemJSON: Codable {
  var uuid: String
  var parent: String
  var name: String
  var type: String
  var mime: String
  var size: Int
  var timestamp: Int
  var lastModified: Int
  var key: String
  var chunks: Int
  var region: String
  var bucket: String
  var version: Int
}

struct UploadChunkData: Decodable {
  var bucket: String
  var region: String
}

struct UploadChunk: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: UploadChunkData?
}

struct MarkUploadAsDoneData: Decodable {
  var chunks: Int
  var size: Int
}

struct MarkUploadAsDone: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: MarkUploadAsDoneData?
}

struct IsSharingFolderDataUser: Decodable {
  var email: String
  var publicKey: String
}

struct IsSharingFolderData: Decodable {
  var sharing: Bool
  var users: [IsSharingFolderDataUser]?
}

struct IsSharingFolder: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: IsSharingFolderData?
}

struct IsLinkingFolderLink: Decodable {
  var linkUUID: String
  var linkKey: String
}

struct IsLinkingFolderData: Decodable {
  var link: Bool
  var links: [IsLinkingFolderLink]?
}

struct IsLinkingFolder: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: IsLinkingFolderData?
}

struct IsSharingItemDataUser: Decodable {
  var email: String
  var publicKey: String
  var id: Int
}

struct IsSharingItemData: Decodable {
  var sharing: Bool
  var users: [IsSharingItemDataUser]?
}

struct IsSharingItem: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: IsSharingItemData?
}

struct IsLinkingItemLink: Decodable {
  var linkUUID: String
  var linkKey: String
}

struct IsLinkingItemData: Decodable {
  var link: Bool
  var links: [IsLinkingItemLink]?
}

struct IsLinkingItem: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: IsLinkingFolderData?
}

struct CheckIfItemParentIsSharedMetadata: Codable {
  var uuid: String
  var name: String?
  var size: Int?
  var mime: String?
  var key: String?
  var lastModified: Int?
  var hash: String?
}

struct GetFolderContentsDataFiles: Decodable {
  var uuid: String
  var bucket: String
  var region: String
  var name: String?
  var size: String?
  var mime: String?
  var chunks: Int
  var parent: String
  var metadata: String
  var version: Int
  var chunksSize: Int?
}

struct GetFolderContentsDataFolders: Decodable {
 var uuid: String
 var name: String
 var parent: String
}

struct GetFolderContentsData: Decodable {
  var files: [GetFolderContentsDataFiles]
  var folders: [GetFolderContentsDataFolders]
}

struct GetFolderContents: Decodable {
  var status: Bool
  var code: String
  var message: String
  var data: GetFolderContentsData?
}

struct ItemToShareFolder: Codable {
  var uuid: String
  var parent: String
  var metadata: FolderMetadata
}

struct ItemToShareFile: Codable {
  var uuid: String
  var parent: String
  var metadata: FileMetadata
}
