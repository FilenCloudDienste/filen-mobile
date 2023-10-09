//
//  NotificationService.swift
//  NotificationServiceExtension
//
//  Created by Jan Lenczyk on 27.09.23.
//

import UserNotifications
import Foundation

class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var mmkv: MMKV?

  override init() {
    let fileManager = FileManager()
    let groupDir = fileManager.containerURL(forSecurityApplicationGroupIdentifier: "group.io.filen.app")?.path
    
    MMKV.initialize(rootDir: nil, groupDir: groupDir!, logLevel: MMKVLogLevel.debug)
  
    self.mmkv = MMKV.init(mmapID: "filen_shared", cryptKey: nil, mode: MMKVMode.multiProcess)
    
    super.init()
  }

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    
    if let bestAttemptContent = bestAttemptContent, let mmkv = mmkv {
        
        print(bestAttemptContent.userInfo)
        
        bestAttemptContent.title = "\(bestAttemptContent.title) [modified]"
        
        contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    if let contentHandler = contentHandler, let bestAttemptContent =  bestAttemptContent {
        contentHandler(bestAttemptContent)
    }
  }
}
