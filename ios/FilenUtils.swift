//
//  FilenUtils.swift
//  Filen
//
//  Created by Jan Lenczyk on 27.09.23.
//

import Foundation

class FilenUtils {
  static let shared: FilenUtils = {
    let instance = FilenUtils()
    
    return instance
  }()
  
  func convertUnixTimestampToMs (_ timestamp: Int) -> Int {
    autoreleasepool {
      let now = Int(Date().timeIntervalSince1970 * 1000)

      if abs(now - timestamp) < abs(now - timestamp * 1000) {
          return timestamp
      }

      return timestamp * 1000
    }
  }

  func convertUnixTimestampToNs (_ timestamp: Int) -> Int {
    autoreleasepool {
      let now = Int(Date().timeIntervalSince1970 * 1_000_000_000)

      if abs(now - timestamp) < abs(now - timestamp * 1_000) {
          return timestamp
      }

      return timestamp * 1_000_000_000
    }
  }
  
  func convertUnixTimestampToSec (_ timestamp: Int) -> Int {
    autoreleasepool {
      let nowInMs = Int(Date().timeIntervalSince1970 * 1000)
      let potentialInSeconds = timestamp / 1000

      if abs(nowInMs - timestamp) > abs(nowInMs - potentialInSeconds * 1000) {
          return potentialInSeconds
      }

      return timestamp
    }
  }
  
  func unixTimestampMs () -> Int {
    autoreleasepool {
      let now = Date()
      let unixTimestampSeconds = now.timeIntervalSince1970
      let millisecondsPart = (unixTimestampSeconds - floor(unixTimestampSeconds)) * 1000.0

      return Int(millisecondsPart)
    }
  }
  
  func orderedJSONString (from value: Any) -> String? { // We need this dirty function to be compatible with JavasScript's JSON.parse()
    autoreleasepool {
      switch value {
        case let str as String:
          let escaped = str
              .replacingOccurrences(of: "\\", with: "\\\\")
              .replacingOccurrences(of: "\"", with: "\\\"")
              .replacingOccurrences(of: "\n", with: "\\n")
              .replacingOccurrences(of: "\r", with: "\\r")
              .replacingOccurrences(of: "\t", with: "\\t")
        
          return "\"\(escaped)\""
        
        case let num as NSNumber:
          return "\(num)"
        
        case let bool as Bool:
          return bool ? "true" : "false"
        
        case let dict as [String: Any]:
          let items = dict.compactMap { key, value -> String? in
            guard let valueString = self.orderedJSONString(from: value) else { return nil }
              
            return "\"\(key)\":\(valueString)"
          }
        
          return "{\(items.joined(separator: ","))}"
        
        case let array as [Any]:
        let items = array.compactMap(self.orderedJSONString)
        
        return "[\(items.joined(separator: ","))]"
        
        default:
            return nil
      }
    }
  }
  
  func appendFile (from sourceURL: URL, to targetURL: URL) throws {
    try autoreleasepool {
      guard let readStream = InputStream(fileAtPath: sourceURL.path) else {
        throw NSError(domain: "Could not open read stream", code: 1, userInfo: nil)
      }
      
      guard let writeStream = OutputStream(toFileAtPath: targetURL.path, append: true) else {
        throw NSError(domain: "Could not open write stream", code: 2, userInfo: nil)
      }
      
      defer {
        readStream.close()
        writeStream.close()
      }

      readStream.open()
      writeStream.open()
      
      let bufferSize = 1024
      var buffer = [UInt8](repeating: 0, count: bufferSize)
      
      while readStream.hasBytesAvailable {
        autoreleasepool {
          let bytesRead = readStream.read(&buffer, maxLength: bufferSize)
          
          if bytesRead > 0 {
            writeStream.write(buffer, maxLength: bytesRead)
          }
        }
      }
    }
  }
  
  func streamEncodeFileToBase64 (input: URL, output: URL) throws -> URL {
    try autoreleasepool {
      let outputBaseURL = output.deletingLastPathComponent()
      
      if !FileManager.default.fileExists(atPath: outputBaseURL.path) {
        try FileManager.default.createDirectory(at: outputBaseURL, withIntermediateDirectories: true, attributes: nil)
      }
      
      guard let inputStream = InputStream(url: input), let outputStream = OutputStream(url: output, append: false) else {
        throw NSError(domain: "Could not open read/write streams", code: 3, userInfo: nil)
      }
      
      defer {
        inputStream.close()
        outputStream.close()
      }
      
      let bufferSize = 3 * 1024
      var buffer = [UInt8](repeating: 0, count: bufferSize)
      
      while inputStream.hasBytesAvailable {
        try autoreleasepool {
          let bytesRead = inputStream.read(&buffer, maxLength: bufferSize)
          
          if bytesRead > 0 {
            let chunk = Array(buffer[0..<bytesRead])
            let encodedChunk = Data(chunk).base64EncodedString()
            
            guard let encodedChunkData = encodedChunk.data(using: .utf8) else {
              throw NSError(domain: "streamEncodeFileToBase64", code: 4, userInfo: nil)
            }
            
            let encodedChunkDataArray = [UInt8](encodedChunkData)
            
            outputStream.write(encodedChunkDataArray, maxLength: encodedChunkDataArray.count)
          }
        }
      }
      
      inputStream.close()
      outputStream.close()
      
      return output
    }
  }
  
  func streamDecodeFileToBase64 (input: URL, output: URL) throws -> URL {
    try autoreleasepool {
      let outputBaseURL = output.deletingLastPathComponent()
      
      if !FileManager.default.fileExists(atPath: outputBaseURL.path) {
        try FileManager.default.createDirectory(at: outputBaseURL, withIntermediateDirectories: true, attributes: nil)
      }
      
      guard let inputStream = InputStream(url: input), let outputStream = OutputStream(url: output, append: false) else {
        throw NSError(domain: "Could not open read/write streams", code: 3, userInfo: nil)
      }
      
      defer {
        inputStream.close()
        outputStream.close()
      }
      
      let bufferSize = 3 * 1024
      var buffer = [UInt8](repeating: 0, count: bufferSize)
      
      while inputStream.hasBytesAvailable {
        autoreleasepool {
          let bytesRead = inputStream.read(&buffer, maxLength: bufferSize)
          
          if bytesRead > 0 {
            let data = Data(buffer[..<bytesRead])
            
            if let decodedData = Data(base64Encoded: data) {
                _ = decodedData.withUnsafeBytes {
                    outputStream.write($0.bindMemory(to: UInt8.self).baseAddress!, maxLength: decodedData.count)
                }
            }
          }
        }
      }
      
      inputStream.close()
      outputStream.close()
      
      return output
    }
  }
  
  
}
