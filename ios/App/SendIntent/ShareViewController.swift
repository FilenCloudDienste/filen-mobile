//
//  ShareViewController.swift
//  mindlib
//
//  Created by Carsten Klaffke on 05.07.20.
//

import UIKit
import Social
import MobileCoreServices

class ShareItem {
    
       public var title: String?
       public var type: String?
       public var url: String?
}

class ShareViewController: SLComposeServiceViewController {

    private var shareItems: [ShareItem] = []
    
    override func isContentValid() -> Bool {
        // Do validation of contentText and/or NSExtensionContext attachments here
        print(contentText ?? "content is empty")
        return true
    }

    override func didSelectPost() {
        let queryItems = shareItems.map { [URLQueryItem(name: "title", value: $0.title?.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? ""), URLQueryItem(name: "description", value: self.contentText?.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? ""), URLQueryItem(name: "type", value: $0.type?.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? ""), URLQueryItem(name: "url", value: $0.url?.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? "")] }.flatMap({ $0 })
        var urlComps = URLComponents(string: "iofilenapp://")!
        urlComps.queryItems = queryItems
        openURL(urlComps.url!)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
        return []
    }

    fileprivate func createSharedFileUrl(_ url: URL?) -> String {
        let fileManager = FileManager.default

        let copyFileUrl = fileManager.containerURL(forSecurityApplicationGroupIdentifier: "group.io.filen.app")!.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)! + "/" + url!.lastPathComponent.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        try? Data(contentsOf: url!).write(to: URL(string: copyFileUrl)!)

        return copyFileUrl
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        
        shareItems.removeAll()
        
        let extensionItem = extensionContext?.inputItems[0] as! NSExtensionItem
        let contentTypeURL = kUTTypeURL as String
        let contentTypeText = kUTTypeText as String
        let contentTypeMovie = kUTTypeMovie as String
        let contentTypeImage = kUTTypeImage as String
       
        for attachment in extensionItem.attachments as! [NSItemProvider] {
            
            if attachment.hasItemConformingToTypeIdentifier(contentTypeURL) {
                attachment.loadItem(forTypeIdentifier: contentTypeURL, options: nil, completionHandler: { [self] (results, error) in
                    if results != nil {
                        let url = results as! URL?
                        let shareItem: ShareItem = ShareItem()
                        
                        if url!.isFileURL {
                            shareItem.title = url!.lastPathComponent
                            shareItem.type = "application/" + url!.pathExtension.lowercased()
                            shareItem.url = createSharedFileUrl(url)
                        } else {
                            shareItem.title = url!.absoluteString
                            shareItem.url = url!.absoluteString
                            shareItem.type = "text/plain"
                        }
                        
                        self.shareItems.append(shareItem)
                        
                    }
                })
            } else if attachment.hasItemConformingToTypeIdentifier(contentTypeText) {
                attachment.loadItem(forTypeIdentifier: contentTypeText, options: nil, completionHandler: { (results, error) in
                    if results != nil {
                        let shareItem: ShareItem = ShareItem()
                        let text = results as! String
                        shareItem.title = text
                        _ = self.isContentValid()
                        shareItem.type = "text/plain"
                        self.shareItems.append(shareItem)
                    }
                })
            } else if attachment.hasItemConformingToTypeIdentifier(contentTypeMovie) {
                attachment.loadItem(forTypeIdentifier: contentTypeMovie, options: nil, completionHandler: { [self] (results, error) in
                    if results != nil {
                        let shareItem: ShareItem = ShareItem()
                        
                        let url = results as! URL?
                        shareItem.title = url!.lastPathComponent
                        shareItem.type = "video/" + url!.pathExtension.lowercased()
                        shareItem.url = createSharedFileUrl(url)
                        self.shareItems.append(shareItem)
                    }
                })
            } else if attachment.hasItemConformingToTypeIdentifier(contentTypeImage) {
                attachment.loadItem(forTypeIdentifier: contentTypeImage, options: nil, completionHandler: { [self] (results, error) in
                    if results != nil {
                        let shareItem: ShareItem = ShareItem()
                        
                        let url = results as! URL?
                        shareItem.title = url!.lastPathComponent
                        shareItem.type = "image/" + url!.pathExtension.lowercased()
                        shareItem.url = createSharedFileUrl(url)
                        self.shareItems.append(shareItem)
                    }
                })
            }
        }
    }

    @objc func openURL(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                return application.perform(#selector(openURL(_:)), with: url) != nil
            }
            responder = responder?.next
        }
        return false
    }

}


