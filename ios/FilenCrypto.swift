//
//  FilenCrypto.swift
//  Filen
//
//  Created by Jan Lenczyk on 27.09.23.
//

import Foundation
import CommonCrypto
import Security
import OpenSSL

class FilenCrypto {
  static let shared: FilenCrypto = {
    let instance = FilenCrypto()
    
    return instance
  }()
  
  public let jsonDecoder = JSONDecoder()
  public let jsonEncoder = JSONEncoder()
  
  init () {
    SSL_library_init()
    SSL_load_error_strings()
    OpenSSL_add_all_algorithms()
    OpenSSL_add_all_ciphers()
    OpenSSL_add_all_digests()
  }
  
  func decryptFolderLinkKey (metadata: String, masterKeys: [String]) throws -> String? {
    autoreleasepool {
      var key: String?
      
      for masterKey in masterKeys.reversed() {
        do {
          try autoreleasepool {
            let decrypted = try self.decryptMetadata(metadata: metadata, key: masterKey)
            
            if let decryptedString = String(data: decrypted, encoding: .utf8) {
              if decryptedString.count > 16 {
                key = decryptedString
              }
            }
          }
          
          if key != nil {
            break
          }
        } catch {
          continue
        }
      }
      
      if let res = key {
        if (res.count < 16) {
          return nil
        }
        
        return res
      }
      
      return nil
    }
  }
  
  func encryptFileName (name: String, fileKey: String) throws -> String {
    try autoreleasepool {
      return try self.encryptMetadata(metadata: name, key: fileKey)
    }
  }
  
  func encryptFileMetadata (metadata: FileMetadata, masterKeys: [String]) throws -> String {
    try autoreleasepool {
      guard let lastMasterKey = masterKeys.last else {
        throw NSError(domain: "encryptFileMetadata", code: 1, userInfo: nil)
      }
      
      let obj = try self.jsonEncoder.encode(metadata)
      
      guard let objString = String(data: obj, encoding: .utf8) else {
        throw NSError(domain: "encryptFileMetadata", code: 2, userInfo: nil)
      }
      
      return try self.encryptMetadata(metadata: objString, key: lastMasterKey)
    }
  }
  
  func encryptFolderName (name: FolderMetadata, masterKeys: [String]) throws -> String {
    try autoreleasepool {
      guard let lastMasterKey = masterKeys.last else {
        throw NSError(domain: "encryptFolderName", code: 1, userInfo: nil)
      }
      
      let obj = try self.jsonEncoder.encode(name)
      
      guard let objString = String(data: obj, encoding: .utf8) else {
        throw NSError(domain: "encryptFolderName", code: 1, userInfo: nil)
      }
      
      return try self.encryptMetadata(metadata: objString, key: lastMasterKey)
    }
  }
  
  func decryptFileMetadata (metadata: String, masterKeys: [String]) -> FileMetadata? {
    autoreleasepool {
      var result: FileMetadata?
      
      for masterKey in masterKeys.reversed() {
        do {
          try autoreleasepool {
            let decrypted = try self.decryptMetadata(metadata: metadata, key: masterKey)
            let obj = try self.jsonDecoder.decode(FileMetadata.self, from: decrypted)
            
            if (obj.name.count > 0) {
              result = obj
            }
          }
          
          if result != nil {
            break
          }
        } catch {
          continue
        }
      }
      
      if let res = result {
        if (res.name.count <= 0) {
          return nil
        }
        
        return res
      }
      
      return nil
    }
  }
  
  func decryptFolderName (metadata: String, masterKeys: [String]) -> String? {
    autoreleasepool {
      if (metadata == "default") {
        return "Default"
      }
      
      var name = ""
      
      for masterKey in masterKeys.reversed() {
        do {
          try autoreleasepool {
            let decrypted = try self.decryptMetadata(metadata: metadata, key: masterKey)
            let obj = try self.jsonDecoder.decode(FolderMetadata.self, from: decrypted)
            
            if (obj.name.count > 0) {
              name = obj.name
            }
          }
          
          if name.count > 0 {
            break
          }
        } catch {
          continue
        }
      }
      
      if (name.count <= 0) {
        return nil
      }
      
      return name
    }
  }
  
  func generateKeyPair() -> (publicKey: String, privateKey: String)? {
    autoreleasepool {
      let attributes: [CFString: Any] = [
          kSecAttrKeyType: kSecAttrKeyTypeRSA,
          kSecAttrKeySizeInBits: 4096
      ]

      guard let keyPair = SecKeyCreateRandomKey(attributes as CFDictionary, nil) else { return nil }
      guard let publicKeyData = SecKeyCopyExternalRepresentation(keyPair, nil) as Data? else { return nil }
      guard let privateKeyData = SecKeyCopyExternalRepresentation(keyPair, nil) as Data? else { return nil }

      let publicKeyBase64 = publicKeyData.base64EncodedString()
      let privateKeyBase64 = privateKeyData.base64EncodedString()

      return (publicKey: publicKeyBase64, privateKey: privateKeyBase64)
    }
  }
  
  func decryptMetadataPrivateKey (metadata: String, privateKey: String) -> String? {
    autoreleasepool {
      var error: Unmanaged<CFError>?
      
      guard let importedKey = self.importPublicKeyFromBase64DER(base64Key: privateKey) else { return nil }
      guard let metadataData = metadata.data(using: .utf8) else { return nil }
      guard let decryptedData = SecKeyCreateDecryptedData(importedKey, .rsaEncryptionOAEPSHA512, metadataData as CFData, &error) as Data? else { return nil }
      guard let decryptedString = String(data: decryptedData, encoding: .utf8) else { return nil }
      
      return decryptedString
    }
  }
  
  func encryptMetadataPublicKey (metadata: String, publicKey: String) -> String? {
    autoreleasepool {
      var error: Unmanaged<CFError>?
    
      guard let importedKey = self.importPublicKeyFromBase64DER(base64Key: publicKey) else { return nil }
      guard let metadataData = metadata.data(using: .utf8) else { return nil }
      guard let encryptedData = SecKeyCreateEncryptedData(importedKey, .rsaEncryptionOAEPSHA512, metadataData as CFData, &error) as Data? else { return nil }
      
      return encryptedData.base64EncodedString()
    }
  }
  
  func streamDecryptData (input: URL, output: URL, key: String, version: Int) throws -> URL {
    try autoreleasepool {
      guard let keyData = key.data(using: .utf8) else {
        throw NSError(domain: "streamDecryptData", code: 1, userInfo: nil)
      }
      
      if !FileManager.default.fileExists(atPath: input.path) {
        throw NSError(domain: "streamDecryptData", code: 2, userInfo: nil)
      }
      
      if FileManager.default.fileExists(atPath: output.path) {
        try FileManager.default.removeItem(atPath: output.path)
      }
      
      let inputHandle = try FileHandle(forReadingFrom: input)
      
      defer {
        do {
          try inputHandle.close()
        } catch {
          print("[streamDecryptData:defer] error:", error)
        }
      }
      
      let inputSize = Int(inputHandle.seekToEndOfFile())
      
      if inputSize < (version == 1 ? 16 : 12) {
        throw NSError(domain: "streamDecryptData", code: 9992, userInfo: nil)
      }
      
      if version == 1 {
        let firstData = inputHandle.readData(ofLength: 16)
        
        try inputHandle.close()
        
        let asciiString = String(data: firstData, encoding: .ascii)
        let base64String = firstData.base64EncodedString()
        let binaryString = self.convertUInt8ArrayToBinaryString([UInt8](firstData))
        var newInput = input
        var needsConvert = true
        var isCBC = true
        
        guard let asciiString = asciiString else {
          throw NSError(domain: "streamDecryptData", code: 9993, userInfo: nil)
        }
        
        if asciiString.starts(with: "Salted_") {
          newInput = input
          needsConvert = false
        }
        
        if asciiString.starts(with: "Salted_") || base64String.starts(with: "U2FsdGVk") || binaryString.starts(with: "Salted_") || binaryString.starts(with: "U2FsdGVk") || asciiString.starts(with: "U2FsdGVk") || binaryString.starts(with: "Salted_") {
          isCBC = false
        }
        
        if needsConvert && !isCBC {
          let tempFileURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString.lowercased(), isDirectory: false)
          
          newInput = try FilenUtils.shared.streamDecodeFileToBase64(input: input, output: tempFileURL)
        }
        
        defer {
          if input.path != newInput.path {
            if FileManager.default.fileExists(atPath: newInput.path) {
              do {
                try FileManager.default.removeItem(atPath: newInput.path)
              } catch {
                print("[streamDecryptData:defer] error:", error)
              }
            }
          }
        }
        
        guard let inputStream = InputStream(url: newInput), let outputStream = OutputStream(url: output, append: false) else {
          throw NSError(domain: "streamDecryptData", code: 9990, userInfo: nil)
        }
        
        let newInputHandle = try FileHandle(forReadingFrom: newInput)
        
        inputStream.open()
        outputStream.open()
        
        defer {
          do {
            try newInputHandle.close()
            
            inputStream.close()
            outputStream.close()
          } catch {
            print("[streamDecryptData] error:", error)
          }
        }
        
        let newInputSize = Int(newInputHandle.seekToEndOfFile())
        let bufferSize = 1024
        var buffer = [UInt8](repeating: 0, count: bufferSize)
        
        if !isCBC {
          newInputHandle.seek(toFileOffset: 8)
          
          let saltData = newInputHandle.readData(ofLength: 8)
          
          try newInputHandle.close()
          
          var keyDerived = [UInt8](repeating: 0, count: 32)
          var ivDerived = [UInt8](repeating: 0, count: 16)
          
          guard keyData.withUnsafeBytes ({ keyPtr in
            saltData.withUnsafeBytes({ saltPtr in
              EVP_BytesToKey(
                EVP_aes_256_cbc(),
                EVP_md5(),
                saltPtr.bindMemory(to: UInt8.self).baseAddress,
                keyPtr.bindMemory(to: UInt8.self).baseAddress,
                Int32(keyData.count),
                1,
                &keyDerived,
                &ivDerived
              )
            })
          }) > 0 else {
            throw NSError(domain: "streamDecryptData", code: 20, userInfo: nil)
          }
          
          guard let ctx = EVP_CIPHER_CTX_new() else {
            throw NSError(domain: "streamDecryptData", code: 21, userInfo: nil)
          }
          
          defer {
            EVP_CIPHER_CTX_free(ctx)
          }
          
          var out = [UInt8](repeating: 0, count: newInputSize)
          var outLength: Int32 = 0
          
          guard EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), nil, &keyDerived, &ivDerived) == 1 else {
            throw NSError(domain: "streamDecryptData", code: 22, userInfo: nil)
          }
          
          guard EVP_CIPHER_CTX_set_padding(ctx, 0) == 1 else {
            throw NSError(domain: "streamDecryptData", code: 27, userInfo: nil)
          }

          let bytesToSkipAtBeginning = 16
          let bytesToSkipAtEnd = 0
          let bytesToReadTotal = inputSize - bytesToSkipAtBeginning - bytesToSkipAtEnd
          var bytesReadTotal = 0

          if bytesToSkipAtBeginning > 0 {
            autoreleasepool {
              _ = inputStream.read(&buffer, maxLength: bytesToSkipAtBeginning)
            }
          }
          
          while inputStream.hasBytesAvailable && bytesReadTotal < bytesToReadTotal {
            let bytesReadThisIteration = min(bufferSize, bytesToReadTotal - bytesReadTotal)
            let bytesRead = inputStream.read(&buffer, maxLength: bytesReadThisIteration)
              
            if bytesRead == 0 {
              break
            }
              
            bytesReadTotal += bytesRead

            let chunk = buffer[0..<bytesRead]

            guard chunk.withUnsafeBytes({ chunkPtr in
              EVP_DecryptUpdate(
                ctx,
                &out,
                &outLength,
                chunkPtr.bindMemory(to: UInt8.self).baseAddress,
                Int32(chunk.count)
              )
            }) == 1 else {
              throw NSError(domain: "streamDecryptData", code: 14, userInfo: nil)
            }
            
            let unpadded = self.removePKCS7Padding(from: out)
            
            outputStream.write(unpadded, maxLength: unpadded.count)
          }
          
          var finalOutLength: Int32 = 0
          
          if EVP_DecryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
            throw NSError(domain: "streamDecryptData", code: 15, userInfo: nil)
          }
          
          if finalOutLength > 0 {
            let unpadded = self.removePKCS7Padding(from: out)
            
            if unpadded.count > 0 {
              outputStream.write(unpadded, maxLength: unpadded.count)
            }
          }
          
          out = []
          buffer = []
          
          inputStream.close()
          outputStream.close()
          
          return output
        } else {
          try newInputHandle.close()
          
          guard let ctx = EVP_CIPHER_CTX_new() else {
            throw NSError(domain: "streamDecryptData", code: 21, userInfo: nil)
          }
          
          defer {
            EVP_CIPHER_CTX_free(ctx)
          }
          
          var out = [UInt8](repeating: 0, count: newInputSize)
          var outLength: Int32 = 0
          
          guard keyData.withUnsafeBytes({ keyPtr in
            self.sliceData(data: keyData, start: 0, end: 16).withUnsafeBytes({ ivPtr in
              EVP_DecryptInit_ex(
                ctx,
                EVP_aes_256_cbc(),
                nil,
                keyPtr.bindMemory(to: UInt8.self).baseAddress,
                ivPtr.bindMemory(to: UInt8.self).baseAddress
              )
            })
          }) == 1 else {
            throw NSError(domain: "streamDecryptData", code: 22, userInfo: nil)
          }
          
          while inputStream.hasBytesAvailable {
            let bytesRead = inputStream.read(&buffer, maxLength: bufferSize)
            
            if bytesRead > 0 {
              let chunk = buffer[0..<bytesRead]

              guard chunk.withUnsafeBytes({ chunkPtr in
                EVP_DecryptUpdate(
                  ctx,
                  &out,
                  &outLength,
                  chunkPtr.bindMemory(to: UInt8.self).baseAddress,
                  Int32(chunk.count)
                )
              }) == 1 else {
                throw NSError(domain: "streamDecryptData", code: 14, userInfo: nil)
              }
              
              outputStream.write(out, maxLength: Int(outLength))
            }
          }
          
          var finalOutLength: Int32 = 0
                    
          if EVP_DecryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
            throw NSError(domain: "streamDecryptData", code: 15, userInfo: nil)
          }
          
          if finalOutLength > 0 {
            outputStream.write(out, maxLength: Int(finalOutLength))
          }
          
          out = []
          buffer = []
          
          inputStream.close()
          outputStream.close()
          
          return output
        }
      } else {
        inputHandle.seek(toFileOffset: 0)
        
        let iv = inputHandle.readData(ofLength: 12)
        
        inputHandle.seek(toFileOffset: UInt64(inputSize - 16))
        
        var authTag = inputHandle.readData(ofLength: 16)
        
        try inputHandle.close()
        
        guard let inputStream = InputStream(url: input), let outputStream = OutputStream(url: output, append: false) else {
          throw NSError(domain: "streamDecryptData", code: 9998, userInfo: nil)
        }
        
        inputStream.open()
        outputStream.open()
        
        defer {
          inputStream.close()
          outputStream.close()
        }
        
        let ctx = EVP_CIPHER_CTX_new()
        
        defer {
          EVP_CIPHER_CTX_free(ctx)
        }
        
        guard EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nil, nil, nil) == 1 else {
          throw NSError(domain: "streamDecryptData", code: 10, userInfo: nil)
        }
        
        guard EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, nil) == 1 else {
          throw NSError(domain: "streamDecryptData", code: 11, userInfo: nil)
        }
        
        guard keyData.withUnsafeBytes({ keyPtr in
          iv.withUnsafeBytes({ ivPtr in
            EVP_DecryptInit_ex(
              ctx,
              nil,
              nil,
              keyPtr.bindMemory(to: UInt8.self).baseAddress,
              ivPtr.bindMemory(to: UInt8.self).baseAddress
            )
          })
        }) == 1 else {
          throw NSError(domain: "streamDecryptData", code: 12, userInfo: nil)
        }
        
        let authTagCount = Int32(authTag.count)
        
        guard authTag.withUnsafeMutableBytes({ tagPtr in
          EVP_CIPHER_CTX_ctrl(
            ctx,
            EVP_CTRL_GCM_SET_TAG,
            authTagCount,
            tagPtr.bindMemory(to: UInt8.self).baseAddress
          )
        }) == 1 else {
          throw NSError(domain: "streamDecryptData", code: 13, userInfo: nil)
        }
        
        let bufferSize = 1024
        var buffer = [UInt8](repeating: 0, count: bufferSize)
        var out = [UInt8](repeating: 0, count: bufferSize + 16)
        var outLength: Int32 = 0
        let bytesToSkipAtBeginning = 12
        let bytesToSkipAtEnd = 16
        let bytesToReadTotal = inputSize - bytesToSkipAtBeginning - bytesToSkipAtEnd
        var bytesReadTotal = 0

        if bytesToSkipAtBeginning > 0 {
          autoreleasepool {
            _ = inputStream.read(&buffer, maxLength: bytesToSkipAtBeginning)
          }
        }
        
        while inputStream.hasBytesAvailable && bytesReadTotal < bytesToReadTotal {
          let bytesReadThisIteration = min(bufferSize, bytesToReadTotal - bytesReadTotal)
          let bytesRead = inputStream.read(&buffer, maxLength: bytesReadThisIteration)
            
          if bytesRead == 0 {
            break
          }
            
          bytesReadTotal += bytesRead

          let chunk = buffer[0..<bytesRead]
          
          guard chunk.withUnsafeBytes({ chunkPtr in
            EVP_DecryptUpdate(
              ctx,
              &out,
              &outLength,
              chunkPtr.bindMemory(to: UInt8.self).baseAddress,
              Int32(chunk.count)
            )
          }) == 1 else {
            throw NSError(domain: "streamDecryptData", code: 14, userInfo: nil)
          }
          
          outputStream.write(out, maxLength: Int(outLength))
        }
        
        var finalOutLength: Int32 = 0
        
        if EVP_DecryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
          throw NSError(domain: "Decryption failed due to tag mismatch", code: 15, userInfo: nil)
        }
        
        if finalOutLength > 0 {
          outputStream.write(out, maxLength: Int(finalOutLength))
        }
        
        out = []
        buffer = []
        
        inputStream.close()
        outputStream.close()
        
        return output
      }
    }
  }
  
  func decryptMetadata (metadata: String, key: String) throws -> Data {
    try autoreleasepool {
      let sliced = metadata.prefix(10)
      
      if (sliced.starts(with: "U2FsdGVk")) { // Old & deprecated, not in use anymore, just here for backwards compatibility
        guard let encryptedData = Data(base64Encoded: metadata), let keyData = key.data(using: .utf8) else {
          throw NSError(domain: "decryptMetadata", code: 1, userInfo: nil)
        }
        
        let saltData = encryptedData.subdata(in: 8..<16)
        let cipherText = encryptedData.dropFirst(16)
        var keyDerived = [UInt8](repeating: 0, count: 32)
        var ivDerived = [UInt8](repeating: 0, count: 16)
        
        guard keyData.withUnsafeBytes ({ keyPtr in
          saltData.withUnsafeBytes({ saltPtr in
            EVP_BytesToKey(
              EVP_aes_256_cbc(),
              EVP_md5(),
              saltPtr.bindMemory(to: UInt8.self).baseAddress,
              keyPtr.bindMemory(to: UInt8.self).baseAddress,
              Int32(keyData.count),
              1,
              &keyDerived,
              &ivDerived
            )
          })
        }) > 0 else {
          throw NSError(domain: "decryptMetadata", code: 20, userInfo: nil)
        }
        
        guard let ctx = EVP_CIPHER_CTX_new() else {
          throw NSError(domain: "decryptMetadata", code: 21, userInfo: nil)
        }
        
        defer {
          EVP_CIPHER_CTX_free(ctx)
        }
        
        var out = [UInt8](repeating: 0, count: cipherText.count)
        var outLength: Int32 = 0
        
        guard EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), nil, &keyDerived, &ivDerived) == 1 else {
          throw NSError(domain: "decryptMetadata", code: 22, userInfo: nil)
        }
        
        guard EVP_CIPHER_CTX_set_padding(ctx, 0) == 1 else {
          throw NSError(domain: "decryptMetadata", code: 27, userInfo: nil)
        }
        
        guard EVP_DecryptUpdate(ctx, &out, &outLength, [UInt8](cipherText), Int32(cipherText.count)) == 1 else {
          throw NSError(domain: "decryptMetadata", code: 23, userInfo: nil)
        }
        
        var finalOutLength: Int32 = 0
        
        if EVP_DecryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
          throw NSError(domain: "decryptMetadata", code: 24, userInfo: nil)
        }
        
        return Data(self.removePKCS7Padding(from: out))
      } else {
        let version = metadata.prefix(3)
        
        if (version == "002") {
          let transformedKey = try self.transformKey(key: key)
          
          guard let encryptedData = metadata.data(using: .utf8), let transformedKeyData = transformedKey.hexToData() else {
            throw NSError(domain: "decryptMetadata", code: 4, userInfo: nil)
          }
          
          let iv = self.sliceData(data: encryptedData, start: 3, end: 15)
          
          guard let encData = Data(base64Encoded: self.sliceData(data: encryptedData, start: 15, end: encryptedData.count)) else {
            throw NSError(domain: "decryptMetadata", code: 5, userInfo: nil)
          }
          
          var authTag = self.sliceData(data: encData, start: encData.count - 16, end: encData.count)
          let cipherText = self.sliceData(data: encData, start: 0, end: encData.count - authTag.count)
          
          guard let ctx = EVP_CIPHER_CTX_new() else {
            throw NSError(domain: "decryptMetadata", code: 6, userInfo: nil)
          }
          
          defer {
            EVP_CIPHER_CTX_free(ctx)
          }

          guard EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nil, nil, nil) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 7, userInfo: nil)
          }
          
          guard EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, nil) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 8, userInfo: nil)
          }
          
          guard transformedKeyData.withUnsafeBytes({ keyPtr in
            iv.withUnsafeBytes({ ivPtr in
              EVP_DecryptInit_ex(ctx, nil, nil, keyPtr.bindMemory(to: UInt8.self).baseAddress, ivPtr.bindMemory(to: UInt8.self).baseAddress)
            })
          }) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 9, userInfo: nil)
          }
          
          let authTagCount = Int32(authTag.count)
          
          guard authTag.withUnsafeMutableBytes({ tagPtr in
            EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, authTagCount, tagPtr.bindMemory(to: UInt8.self).baseAddress!)
          }) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 10, userInfo: nil)
          }
          
          var out = [UInt8](repeating: 0, count: cipherText.count + Int(EVP_MAX_BLOCK_LENGTH))
          var outLength: Int32 = 0
          let cipherTextCount = Int32(cipherText.count)
          
          guard EVP_DecryptUpdate(ctx, &out, &outLength, [UInt8](cipherText), cipherTextCount) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 11, userInfo: nil)
          }
          
          var finalOutLength: Int32 = 0
          
          if EVP_DecryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
            throw NSError(domain: "decryptMetadata", code: 14, userInfo: nil)
          }
          
          return Data(bytes: out, count: Int(outLength + finalOutLength))
        } else {
          throw NSError(domain: "decryptMetadata", code: 13, userInfo: nil)
        }
      }
    }
  }
  
  func streamEncryptData (input: URL, output: URL, key: String, version: Int = 2, index: Int) throws -> (output: URL, checksum: String) {
    try autoreleasepool {
      let chunkSize = 1024 * 1024
      let offset = UInt64(index * chunkSize)
      
      guard let keyData = key.data(using: .utf8) else {
        throw NSError(domain: "streamEncryptData", code: 1, userInfo: nil)
      }
      
      if !FileManager.default.fileExists(atPath: input.path) {
        throw NSError(domain: "streamEncryptData", code: 2, userInfo: nil)
      }
      
      do {
        if FileManager.default.fileExists(atPath: output.path) {
          try FileManager.default.removeItem(atPath: output.path)
        }
        
        let inputHandle = try FileHandle(forReadingFrom: input)
        
        defer {
          do {
            try inputHandle.close()
          } catch {
            print("[streamEncryptData] error:", error)
          }
        }
        
        let inputSize = Int(inputHandle.seekToEndOfFile())
        
        if inputSize < offset {
          throw NSError(domain: "streamEncryptData", code: 3, userInfo: nil)
        }
        
        inputHandle.seek(toFileOffset: offset)
        
        if version == 1 {
          throw NSError(domain: "streamEncryptData", code: 4, userInfo: nil)
        } else if version == 2 {
          guard let outputStream = OutputStream(url: output, append: false) else {
            throw NSError(domain: "streamEncryptData", code: 9990, userInfo: nil)
          }
          
          outputStream.open()
          
          defer {
            outputStream.close()
          }
          
          var digestCtx = SHA512_CTX()
          
          guard SHA512_Init(&digestCtx) == 1 else {
            throw NSError(domain: "decryptMetadata", code: 51, userInfo: nil)
          }
          
          let iv = try self.generateRandomString(length: 12)
          
          guard let ivData = iv.data(using: .utf8) else {
            throw NSError(domain: "streamEncryptData", code: 9991, userInfo: nil)
          }
          
          let ivArray = [UInt8](ivData)
          
          outputStream.write(ivArray, maxLength: ivArray.count)
          
          guard ivArray.withUnsafeBytes({ ivPtr in
            SHA512_Update(
              &digestCtx,
              ivPtr.bindMemory(to: UInt8.self).baseAddress,
              ivArray.count
            )
          }) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 58, userInfo: nil)
          }
          
          guard let ctx = EVP_CIPHER_CTX_new() else {
            throw NSError(domain: "decryptMetadata", code: 6, userInfo: nil)
          }
          
          defer {
            EVP_CIPHER_CTX_free(ctx)
          }
          
          guard EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nil, nil, nil) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 5, userInfo: nil)
          }
          
          guard EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, nil) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 6, userInfo: nil)
          }
          
          guard ivArray.withUnsafeBytes({ ivPtr in
            keyData.withUnsafeBytes({ keyPtr in
              EVP_EncryptInit_ex(
                ctx,
                nil,
                nil,
                keyPtr.bindMemory(to: UInt8.self).baseAddress,
                ivPtr.bindMemory(to: UInt8.self).baseAddress
              )
            })
          }) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 7, userInfo: nil)
          }
          
          let bufferSize = 1024
          var bytesRead = 0
          var chunk = Data(capacity: bufferSize)
          var out = [UInt8](repeating: 0, count: chunkSize + 16)
          var outLength: Int32 = 0
          
          while chunkSize > bytesRead {
            chunk.append(inputHandle.readData(ofLength: bufferSize))
            
            if chunk.count <= 0 {
              chunk.removeAll()
              
              break
            }
            
            guard chunk.withUnsafeBytes({ chunkPtr in
              EVP_EncryptUpdate(
                ctx,
                &out,
                &outLength,
                chunkPtr.bindMemory(to: UInt8.self).baseAddress,
                Int32(chunk.count)
              )
            }) == 1 else {
              throw NSError(domain: "streamEncryptData", code: 8, userInfo: nil)
            }
            
            guard out.withUnsafeBytes({ outPtr in
              SHA512_Update(
                &digestCtx,
                outPtr.bindMemory(to: UInt8.self).baseAddress,
                Int(outLength)
              )
            }) == 1 else {
              throw NSError(domain: "streamEncryptData", code: 58, userInfo: nil)
            }
            
            outputStream.write(out, maxLength: Int(outLength))
            
            bytesRead += bufferSize
            
            chunk.removeAll()
          }
          
          var finalOutLength: Int32 = 0
          
          if EVP_EncryptFinal_ex(ctx, &out, &finalOutLength) <= 0 {
            throw NSError(domain: "streamEncryptData", code: 15, userInfo: nil)
          }
          
          if finalOutLength > 0 {
            outputStream.write(out, maxLength: Int(finalOutLength))
            
            guard out.withUnsafeBytes({ outPtr in
              SHA512_Update(
                &digestCtx,
                outPtr.bindMemory(to: UInt8.self).baseAddress,
                Int(outLength)
              )
            }) == 1 else {
              throw NSError(domain: "streamEncryptData", code: 59, userInfo: nil)
            }
          }
          
          var authTag = [UInt8](repeating: 0, count: 16)
          
          if EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, &authTag) != 1 {
            throw NSError(domain: "streamEncryptData", code: 17, userInfo: nil)
          }
          
          outputStream.write(authTag, maxLength: authTag.count)
          
          guard authTag.withUnsafeBytes({ authTagPtr in
            SHA512_Update(
              &digestCtx,
              authTagPtr.bindMemory(to: UInt8.self).baseAddress,
              authTag.count
            )
          }) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 60, userInfo: nil)
          }
          
          var hash = [UInt8](repeating: 0, count: Int(SHA512_DIGEST_LENGTH))
          
          guard SHA512_Final(&hash, &digestCtx) == 1 else {
            throw NSError(domain: "streamEncryptData", code: 61, userInfo: nil)
          }
          
          out = []
          chunk.removeAll()
          
          try inputHandle.close()
          
          outputStream.close()
          
          return (output: output, checksum: hash.map { String(format: "%02x", $0) }.joined())
        } else {
          throw NSError(domain: "streamEncryptData", code: 27, userInfo: nil)
        }
      } catch {
        print("[streamEncryptData] error:", error)
        
        throw NSError(domain: "streamEncryptData", code: 87, userInfo: nil)
      }
    }
  }
  
  func encryptMetadata (metadata: String, key: String) throws -> String {
    try autoreleasepool {
      let transformedKey = try self.transformKey(key: key)
      let iv = try self.generateRandomString(length: 12)
      
      guard let transformedKeyData = transformedKey.hexToData(), let metadataData = metadata.data(using: .utf8), let ivData = iv.data(using: .utf8) else {
        throw NSError(domain: "encryptMetadata", code: 1, userInfo: nil)
      }
      
      var keyBytes = [UInt8](repeating: 0, count: transformedKeyData.count)
      
      transformedKeyData.copyBytes(to: &keyBytes, count: transformedKeyData.count)
      
      guard let ctx = EVP_CIPHER_CTX_new() else {
        throw NSError(domain: "encryptMetadata", code: 2, userInfo: nil)
      }
      
      defer {
        EVP_CIPHER_CTX_free(ctx)
      }
      
      if EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nil, nil, nil) != 1 {
        throw NSError(domain: "encryptMetadata", code: 2, userInfo: nil)
      }
      
      if EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, nil) != 1 {
        throw NSError(domain: "encryptMetadata", code: 3, userInfo: nil)
      }
      
      if EVP_EncryptInit_ex(ctx, nil, nil, keyBytes, [UInt8](ivData)) != 1 {
        throw NSError(domain: "encryptMetadata", code: 4, userInfo: nil)
      }
      
      var out = [UInt8](repeating: 0, count: metadataData.count)
      var outLength: Int32 = 0
      
      if EVP_EncryptUpdate(ctx, &out, &outLength, [UInt8](metadataData), Int32(metadataData.count)) != 1 {
        throw NSError(domain: "encryptMetadata", code: 5, userInfo: nil)
      }
      
      if EVP_EncryptFinal_ex(ctx, &out, &outLength) != 1 {
        throw NSError(domain: "encryptMetadata", code: 6, userInfo: nil)
      }
      
      var authTag = [UInt8](repeating: 0, count: 16)
      
      if EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, &authTag) != 1 {
        throw NSError(domain: "encryptMetadata", code: 7, userInfo: nil)
      }
      
      return "002" + iv + Data(out + authTag).base64EncodedString()
    }
  }
  
  // Old & deprecated, not in use anymore, just here for backwards compatibility
  func hashPassword (password: String) throws -> String {
    try autoreleasepool {
      let sha1_1 = try self.hash(message: password, hash: .sha1)
      let sha256_1 = try self.hash(message: sha1_1, hash: .sha256)
      let sha384_1 = try self.hash(message: sha256_1, hash: .sha384)
      let sha512_1 = try self.hash(message: sha384_1, hash: .sha384)
      let md2_2 = try self.hash(message: password, hash: .md2)
      let md4_2 = try self.hash(message: md2_2, hash: .md4)
      let md5_2 = try self.hash(message: md4_2, hash: .md5)
      let sha512_2 = try self.hash(message: md5_2, hash: .sha512)
      
      return sha512_1 + sha512_2
    }
  }
  
  func hashFn (message: String) throws -> String {
    try autoreleasepool {
      let sha512 = try self.hash(message: message, hash: .sha512)
      
      return try self.hash(message: sha512, hash: .sha1)
    }
  }
  
  func generateRandomString (length: Int) throws -> String {
    try autoreleasepool {
      let alphanumericChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let charsLength = alphanumericChars.count
      var randomBytes = [UInt8](repeating: 0, count: length)
      
      guard RAND_bytes(&randomBytes, Int32(length)) == 1 else {
        throw NSError(domain: "generateRandomString", code: 1, userInfo: nil)
      }

      var randomString = ""
      
      for i in 0..<length {
        let cursor = randomBytes[i]
        let index = Int(cursor) % charsLength
        let char = alphanumericChars[alphanumericChars.index(alphanumericChars.startIndex, offsetBy: index)]
        
        randomString.append(char)
      }

      return randomString
    }
  }
  
  func checksumData (data: Data) -> String {
    autoreleasepool {
      var hash = [UInt8](repeating: 0, count: Int(SHA512_DIGEST_LENGTH))

      _ = data.withUnsafeBytes {
        SHA512($0.bindMemory(to: UInt8.self).baseAddress, data.count, &hash)
      }

      return hash.map { String(format: "%02x", $0) }.joined()
    }
  }
  
  func hash (message: String, hash: Hashes) throws -> String {
    try autoreleasepool {
      guard let messageData = message.data(using: .utf8) else {
        throw NSError(domain: "hash", code: 1, userInfo: nil)
      }

      switch hash {
      case .sha512:
        var hashed = [UInt8](repeating: 0, count: Int(SHA512_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          SHA512($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .sha384:
        var hashed = [UInt8](repeating: 0, count: Int(SHA384_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          SHA384($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .sha256:
        var hashed = [UInt8](repeating: 0, count: Int(SHA256_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          SHA256($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .sha1:
        var hashed = [UInt8](repeating: 0, count: Int(SHA_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          SHA1($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .md5:
        var hashed = [UInt8](repeating: 0, count: Int(MD5_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          MD5($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .md2:
        var hashed = [UInt8](repeating: 0, count: Int(CC_MD2_DIGEST_LENGTH))
        
        messageData.withUnsafeBytes { buffer in
          _ = CC_MD2(buffer.baseAddress, CC_LONG(buffer.count), &hashed)
        }
        
        return Data(hashed).toHex()
        
      case .md4:
        var hashed = [UInt8](repeating: 0, count: Int(MD4_DIGEST_LENGTH))
        
        _ = messageData.withUnsafeBytes {
          MD4($0.bindMemory(to: UInt8.self).baseAddress, messageData.count, &hashed)
        }
        
        return Data(hashed).toHex()
      }
    }
  }
  
  // Used to transform encryption keys to valid length
  // Encryption keys are already derived and safe
  func transformKey (key: String) throws -> String {
    try autoreleasepool {
      return try self.deriveKeyFromPassword(password: key, salt: key, bitLength: 256, hash: .sha512, rounds: 1)
    }
  }
  
  func deriveKeyFromPassword (password: String, salt: String, bitLength: Int, hash: PBKDF2Hashes, rounds: Int) throws -> String {
    try autoreleasepool {
      return try self.pbkdf2(password: password, salt: salt, bitLength: bitLength, hash: hash, rounds: rounds)
    }
  }
  
  func pbkdf2 (password: String, salt: String, bitLength: Int, hash: PBKDF2Hashes, rounds: Int) throws -> String {
    try autoreleasepool {
      guard let passwordData = password.data(using: .utf8), let saltData = salt.data(using: .utf8) else {
        throw NSError(domain: "pbkdf2", code: 1, userInfo: nil)
      }

      let derivedKeyLength = bitLength / 8
      var derivedKey = [UInt8](repeating: 0, count: derivedKeyLength)

      let derivationStatus = passwordData.withUnsafeBytes { passwordBytes in
          saltData.withUnsafeBytes { saltBytes in
              PKCS5_PBKDF2_HMAC(
                  passwordBytes.bindMemory(to: Int8.self).baseAddress,
                  Int32(passwordData.count),
                  saltBytes.bindMemory(to: UInt8.self).baseAddress,
                  Int32(saltData.count),
                  Int32(rounds),
                  hash == .sha512 ? EVP_sha512() : hash == .sha256 ? EVP_sha256() : EVP_sha1(),
                  Int32(derivedKeyLength),
                  &derivedKey
              )
          }
      }

      if derivationStatus == 1 {
          return derivedKey.map { String(format: "%02hhx", $0) }.joined()
      }
      
      throw NSError(domain: "pbkdf2", code: 2, userInfo: nil)
    }
  }
  
  func importPublicKeyFromBase64DER(base64Key: String) -> SecKey? {
    guard let derData = Data(base64Encoded: base64Key) else { return nil }
    
    let keyAttributes: [CFString: Any] = [
        kSecAttrKeyType: kSecAttrKeyTypeRSA,
        kSecAttrKeyClass: kSecAttrKeyClassPublic,
        kSecAttrKeySizeInBits: 4096
    ]
    
    var error: Unmanaged<CFError>?
  
    if let publicKey = SecKeyCreateWithData(derData as CFData, keyAttributes as CFDictionary, &error) {
      return publicKey
    }
    
    return nil
  }
  
  func removePKCS7Padding(from bytes: [UInt8]) -> [UInt8] {
    autoreleasepool {
      guard let lastByte = bytes.last else {
        return bytes
      }
      
      let paddingLength = Int(lastByte)
      
      if paddingLength > 0 && paddingLength <= 16 {
        let range = bytes.count - paddingLength..<bytes.count
        
        for index in range {
          if bytes[index] != lastByte {
            return bytes
          }
        }
        
        return Array(bytes[..<range.lowerBound])
      }
      
      return bytes
    }
  }
  
  func sliceData(data: Data, start: Int, end: Int) -> Data {
    autoreleasepool {
      let startIndex = max(start, 0)
      let endIndex = min(end, data.count)
      let length = max(endIndex - startIndex, 0)
      let range = startIndex..<startIndex + length
      
      return data.subdata(in: range)
    }
  }
  
  func convertUInt8ArrayToBinaryString(_ u8Array: [UInt8]) -> String {
    autoreleasepool {
      var binaryString = ""
      
      for byte in u8Array {
          binaryString.append(Character(UnicodeScalar(byte)))
      }
      
      return binaryString
    }
  }
}

extension Data {
  func toHex() -> String {
    return map { String(format: "%02hhx", $0) }.joined()
  }
}

extension String {
    func hexToData () -> Data? {
        var data = Data(capacity: count / 2)
        let regex = try! NSRegularExpression(pattern: "[0-9a-f]{1,2}", options: .caseInsensitive)
      
        regex.enumerateMatches (in: self, range: NSRange(startIndex..., in: self)) { match, _, _ in
            let byteString = (self as NSString).substring(with: match!.range)
            let num = UInt8(byteString, radix: 16)!
          
            data.append(num)
        }
        
        guard data.count > 0 else { return nil }
        
        return data
    }
}

enum Hashes {
  case sha512, sha384, sha256, sha1, md5, md2, md4
}

enum PBKDF2Hashes {
  case sha512, sha256, sha1
}

struct FolderMetadata: Codable {
  var name: String
}

struct FileMetadata: Codable {
  var name: String
  var size: Int?
  var mime: String?
  var key: String
  var lastModified: Int?
  var hash: String?
}
