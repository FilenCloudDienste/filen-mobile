//
//  NotificationService.swift
//  NotificationServiceExtension
//
//  Created by Jan Lenczyk on 27.09.23.
//

import UserNotifications
import Foundation
import IkigaJSON

class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  public let jsonDecoder = IkigaJSONDecoder()

  override init () {
    super.init()
  }
  
  private func isLoggedIn () -> Bool {
    autoreleasepool {
      guard let loggedIn = MMKVInstance.shared.instance?.bool(forKey: "isLoggedIn", defaultValue: false), let apiKey = MMKVInstance.shared.instance?.string(forKey: "apiKey", defaultValue: nil), let masterKeys = MMKVInstance.shared.instance?.string(forKey: "masterKeys", defaultValue: nil) else {
        return false
      }
      
      if (!loggedIn || apiKey.count <= 0 || masterKeys.count <= 0) {
        return false
      }
          
      return true
    }
  }
  
  private func userId () -> Int {
    autoreleasepool {
      guard let id = MMKVInstance.shared.instance?.double(forKey: "userId", defaultValue: 0) else {
        return 0
      }
      
      return Int(id)
    }
  }
  
  private func notificationBadgeCount () -> Int {
    autoreleasepool {
      guard let id = MMKVInstance.shared.instance?.double(forKey: "notificationBadgeCount", defaultValue: 0) else {
        return 0
      }
      
      return Int(id)
    }
  }

  override func didReceive (_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    
    if let bestAttemptContent = bestAttemptContent {
      if self.isLoggedIn() {
        do {
          if let userIdDouble = MMKVInstance.shared.instance?.double(forKey: "userId", defaultValue: 0) {
            if let privateKey = MMKVInstance.shared.instance?.string(forKey: "privateKey", defaultValue: "") {
              if privateKey.count > 0 {
                let type = bestAttemptContent.userInfo["type"] as? String
                let userId = Int(userIdDouble)
                
                if type == "chatMessageNew" {
                  let conversationUUID = bestAttemptContent.userInfo["conversation"] as? String
                  let senderEmail = bestAttemptContent.userInfo["senderEmail"] as? String
                  let senderNickName = bestAttemptContent.userInfo["senderNickName"] as? String
                  let messageEncrypted = bestAttemptContent.userInfo["message"] as? String
                  
                  if let messageEncryptedRaw = messageEncrypted {
                    var senderName = "A user"
                    var messageDecrypted = "Sent you a message"
                    
                    if let senderEmail = senderEmail {
                      if senderEmail.count > 0 {
                        senderName = senderEmail
                      }
                    }
                    
                    if let senderNickName = senderNickName {
                      if senderNickName.count > 0 {
                        senderName = senderNickName
                      }
                    }
                    
                    bestAttemptContent.title = senderName
                          
                    if let conversationsJSON = MMKVInstance.shared.instance?.string(forKey: "chatConversations", defaultValue: "[]") {
                      if let conversationsData = conversationsJSON.data(using: .utf8) {
                        let conversations = try self.jsonDecoder.decode([ChatConversation].self, from: conversationsData)
                        
                        for conversation in conversations {
                          if conversation.uuid == conversationUUID {
                            for participant in conversation.participants {
                              if participant.userId == userId {
                                if let participantMetadataDecryptedJSON = FilenCrypto.shared.decryptMetadataPrivateKey(metadata: participant.metadata, privateKey: privateKey) {
                                  if let participantMetadataDecryptedData = participantMetadataDecryptedJSON.data(using: .utf8) {
                                    let chatKey = try self.jsonDecoder.decode(ChatKeyMetadata.self, from: participantMetadataDecryptedData).key
                                    let messageDecryptedData = try FilenCrypto.shared.decryptMetadata(metadata: messageEncryptedRaw, key: chatKey)
                                    let messageDecryptedString = try self.jsonDecoder.decode(ChatMessageMetadata.self, from: messageDecryptedData).message
                                    
                                    messageDecrypted = messageDecryptedString
                                    
                                    print(messageDecrypted)
                                    
                                    break
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    
                    bestAttemptContent.body = messageDecrypted
                  }
                }
                
                if type == "contactRequestReceived" {
                  let senderEmail = bestAttemptContent.userInfo["senderEmail"] as? String
                  let senderNickName = bestAttemptContent.userInfo["senderNickName"] as? String
                  
                  var senderName = "A user"
                  
                  if let senderEmail = senderEmail {
                    if senderEmail.count > 0 {
                      senderName = senderEmail
                    }
                  }
                  
                  if let senderNickName = senderNickName {
                    if senderNickName.count > 0 {
                      senderName = senderNickName
                    }
                  }
                  
                  bestAttemptContent.title = senderName
                  bestAttemptContent.body = "Sent you a contact request"
                }
              }
            }
          }
          
          let newBadgeCount = notificationBadgeCount() + 1
          
          bestAttemptContent.badge = NSNumber(value: newBadgeCount)
          
          MMKVInstance.shared.instance?.set(Double(newBadgeCount), forKey: "notificationBadgeCount")
        } catch {
          print("[didReceive] error: \(error)")
        }
      }
      
      bestAttemptContent.sound = nil
      
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire () {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    
    if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
        contentHandler(bestAttemptContent)
    }
  }
}

struct ChatKeyMetadata: Codable {
  var key: String
}

struct ChatMessageMetadata: Codable {
  var message: String
}

struct ChatConversationParticipant: Codable {
  var userId: Int
  var email: String
  var avatar: String?
  var nickName: String
  var metadata: String
  var permissionsAdd: Bool
  var addedTimestamp: Int
}

struct ChatConversation: Codable {
  var uuid: String
  var lastMessageSender: Int
  var lastMessage: String?
  var lastMessageTimestamp: Int
  var lastMessageUUID: String?
  var ownerId: Int
  var name: String?
  var participants: [ChatConversationParticipant]
  var createdTimestamp: Int
}
