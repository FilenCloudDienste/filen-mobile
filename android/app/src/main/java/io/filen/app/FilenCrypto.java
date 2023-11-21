package io.filen.app;

import android.util.Log;
import javax.annotation.Nullable;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.SecretKeyFactory;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.spec.KeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.spec.IvParameterSpec;
import java.security.SecureRandom;
import java.util.UUID;
import org.json.*;

public class FilenCrypto {
    @Nullable
    public static FileMetadata decryptFileMetadata (String metadata, String[] masterKeys) {
        for (final String masterKey: reverseStringArray(masterKeys)) {
            try {
                final JSONObject json = new JSONObject(decryptMetadata(metadata, masterKey));
                final String name = json.getString("name");

                if (name.length() > 0) {
                    FileMetadata fileMetadata = new FileMetadata("", 0, "", "", 0, "");

                    fileMetadata.name = json.getString("name");
                    fileMetadata.key = json.getString("key");

                    try {
                        fileMetadata.size = json.getInt("size");
                    } catch (Exception e) {
                        fileMetadata.size = 1;
                    }

                    try {
                        fileMetadata.mime = json.getString("mime");
                    } catch (Exception e) {
                        fileMetadata.mime = "application/octet-stream";
                    }

                    try {
                        fileMetadata.lastModified = json.getInt("lastModified");
                    } catch (Exception e) {
                        fileMetadata.lastModified = System.currentTimeMillis();
                    }

                    try {
                        fileMetadata.hash = json.getString("hash");
                    } catch (Exception e) {
                        fileMetadata.hash = "";
                    }

                    return fileMetadata;
                }
            } catch (Exception e) {
                // Noop
            }
        }

        return null;
    }

    @Nullable
    public static String decryptFolderName (String metadata, String[] masterKeys) {
        for (final String masterKey: reverseStringArray(masterKeys)) {
            try {
                final JSONObject json = new JSONObject(decryptMetadata(metadata, masterKey));
                final String name = json.getString("name");

                if (name.length() > 0) {
                    return name;
                }
            } catch (Exception e) {
                // Noop
            }
        }

        return null;
    }

    public static String decryptMetadata (String metadata, String key) throws Exception {
        if (metadata.startsWith("U2FsdGVk")) {
            final byte[] encryptedData = Base64.getDecoder().decode(metadata);
            final byte[] salt = Arrays.copyOfRange(encryptedData, 8, 16);
            final byte[] cipherText = Arrays.copyOfRange(encryptedData, 16, encryptedData.length);
            final byte[][] keyAndIV = EVP_BytesToKey(32, 16, MessageDigest.getInstance("MD5"), salt, key.getBytes(), 1);
            final byte[] keyBytes = keyAndIV[0];
            final byte[] ivBytes = keyAndIV[1];

            final Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7Padding");

            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new IvParameterSpec(ivBytes));

            return new String(cipher.doFinal(cipherText));
        } else {
            final String version = metadata.substring(0, 3);

            if ("002".equals(version)) {
                final byte[] transformedKey = hexToBytes(transformKey(key));
                final byte[] metadataBytes = metadata.getBytes();
                final byte[] iv = Arrays.copyOfRange(metadataBytes, 3, 15);
                final byte[] cipherText = Base64.getDecoder().decode(Arrays.copyOfRange(metadataBytes, 15, metadataBytes.length));

                final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                final GCMParameterSpec gcmParameterSpec = new GCMParameterSpec(128, iv);
                final SecretKeySpec keySpec = new SecretKeySpec(transformedKey, "AES");

                cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmParameterSpec);

                return new String(cipher.doFinal(cipherText));
            }

            throw new IllegalArgumentException("Unsupported version.");
        }
    }

    public static File streamDecodeBase64 (File inputFile) throws Exception {
        final File outputBaseDir = new File(inputFile.getPath()).getParentFile();

        assert outputBaseDir != null;

        if (!outputBaseDir.exists()) {
            outputBaseDir.mkdirs();
        }

        final File outputFile = new File(outputBaseDir, UUID.randomUUID().toString());

        FileInputStream inputStream = null;
        FileOutputStream outputStream = null;

        try {
            inputStream = new FileInputStream(inputFile);
            outputStream = new FileOutputStream(outputFile);

            int bufferSize = 3 * 1024;
            byte[] buffer = new byte[bufferSize];

            int bytesRead;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                if (bytesRead > 0) {
                    byte[] decodedChunk = Base64.getDecoder().decode(buffer);

                    outputStream.write(decodedChunk);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();

            throw e;
        } finally {
            if (inputStream != null) {
                inputStream.close();
            }

            if (outputStream != null) {
                outputStream.close();
            }
        }

        return outputFile;
    }

    public static File streamDecryptData (File inputFile, String key, int version) throws Exception {
        if (!inputFile.exists()) {
            throw new Exception("Input file does not exist.");
        }

        final File outputBaseDir = new File(inputFile.getPath()).getParentFile();

        assert outputBaseDir != null;

        if (!outputBaseDir.exists()) {
            outputBaseDir.mkdirs();
        }

        final File outputFile = new File(outputBaseDir, UUID.randomUUID().toString());
        final long inputFileSize = inputFile.length();

        if (inputFileSize < (version == 1 ? 16 : 12)) {
            throw new Exception("Input file size too small: " + inputFileSize + ".");
        }

        RandomAccessFile inputFileHandle = null;
        RandomAccessFile newInputFileHandle = null;
        FileInputStream fileInputStream = null;
        FileOutputStream fileOutputStream = null;

        try {
            inputFileHandle = new RandomAccessFile(inputFile, "r");
            fileOutputStream = new FileOutputStream(outputFile);

            int bufferSize = 1024;
            byte[] buffer = new byte[bufferSize];

            if (version == 1) { // Old & deprecated, not in use anymore, just here for backwards compatibility
                byte[] firstBytes = new byte[16];

                inputFileHandle.read(firstBytes, 0, 16);

                final String asciiString = new String(firstBytes, StandardCharsets.US_ASCII);
                final String base64String = Base64.getEncoder().encodeToString(firstBytes);
                final String utf8String = new String(firstBytes, StandardCharsets.UTF_8);
                File newInputFile = inputFile;
                boolean needsConvert = true;
                boolean isCBC = true;

                if (asciiString.startsWith("Salted_") || base64String.startsWith("Salted_") || utf8String.startsWith("Salted_")) {
                    needsConvert = false;
                }

                if (asciiString.startsWith("Salted_") || base64String.startsWith("Salted_") || utf8String.startsWith("U2FsdGVk") || asciiString.startsWith("U2FsdGVk") || utf8String.startsWith("Salted_") || base64String.startsWith("U2FsdGVk")) {
                    isCBC = false;
                }

                if (needsConvert && !isCBC) {
                    newInputFile = streamDecodeBase64(inputFile);
                }

                newInputFileHandle = new RandomAccessFile(newInputFile, "r");

                if (!isCBC) {
                    byte[] saltBytes = new byte[8];

                    newInputFileHandle.read(saltBytes, 8, 8);

                    final byte[][] keyAndIV = EVP_BytesToKey(32, 16, MessageDigest.getInstance("MD5"), saltBytes, key.getBytes(), 1);
                    final byte[] keyBytes = keyAndIV[0];
                    final byte[] ivBytes = keyAndIV[1];

                    final Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7Padding");

                    cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new IvParameterSpec(ivBytes));

                    fileInputStream = new FileInputSkipStream(newInputFile, 16, 0);

                    int bytesRead;

                    while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                        if (bytesRead > 0) {
                            final byte[] decryptedChunk = cipher.update(buffer, 0, bytesRead);

                            if (decryptedChunk != null) {
                                if (decryptedChunk.length > 0) {
                                    fileOutputStream.write(decryptedChunk);
                                }
                            }
                        }
                    }

                    final byte[] finalDecryptedChunk = cipher.doFinal();

                    if (finalDecryptedChunk != null) {
                        if (finalDecryptedChunk.length > 0) {
                            fileOutputStream.write(finalDecryptedChunk);
                        }
                    }
                } else {
                    final byte[] keyBytes = key.getBytes();
                    final byte[] ivBytes = Arrays.copyOfRange(keyBytes, 0, 16);

                    final Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7Padding");

                    cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new IvParameterSpec(ivBytes));

                    fileInputStream = new FileInputStream(newInputFile);

                    int bytesRead;

                    while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                        if (bytesRead > 0) {
                            final byte[] decryptedChunk = cipher.update(buffer, 0, bytesRead);

                            if (decryptedChunk != null) {
                                if (decryptedChunk.length > 0) {
                                    fileOutputStream.write(decryptedChunk);
                                }
                            }
                        }
                    }

                    final byte[] finalDecryptedChunk = cipher.doFinal();

                    if (finalDecryptedChunk != null) {
                        if (finalDecryptedChunk.length > 0) {
                            fileOutputStream.write(finalDecryptedChunk);
                        }
                    }
                }

                return outputFile;
            } else if (version == 2) {
                final byte[] ivBytes = new byte[12];
                final byte[] keyBytes = key.getBytes();

                inputFileHandle.read(ivBytes, 0, 12);

                final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                final GCMParameterSpec gcmParameterSpec = new GCMParameterSpec(128, ivBytes);
                final SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

                cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmParameterSpec);

                fileInputStream = new FileInputSkipStream(inputFile, 12, 0);
                int bytesRead;

                while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                    if (bytesRead > 0) {
                        final byte[] decryptedChunk = cipher.update(buffer, 0, bytesRead);

                        if (decryptedChunk != null) {
                            if (decryptedChunk.length > 0) {
                                fileOutputStream.write(decryptedChunk);
                            }
                        }
                    }
                }

                final byte[] finalDecryptedChunk = cipher.doFinal();

                if (finalDecryptedChunk != null) {
                    if (finalDecryptedChunk.length > 0) {
                        fileOutputStream.write(finalDecryptedChunk);
                    }
                }

                return outputFile;
            } else {
                throw new Exception("Invalid decryption version: " + version + ".");
            }
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "streamDecryptData error: " + e.getMessage());

            throw e;
        } finally {
            if (inputFileHandle != null) {
                inputFileHandle.close();
            }

            if (newInputFileHandle != null) {
                newInputFileHandle.close();
            }

            if (fileInputStream != null) {
                fileInputStream.close();
            }

            if (fileOutputStream != null) {
                fileOutputStream.close();
            }
        }
    }

    public static String generateSecureRandomString (int length) {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (int i = 0; i < length; i++) {
            int randomIndex = random.nextInt(characters.length());

            sb.append(characters.charAt(randomIndex));
        }

        return sb.toString();
    }

    public static Object[] streamEncryptData (File inputFile, long chunkSize, String key, int index) throws Exception {
        if (!inputFile.exists()) {
            throw new Exception("Input file does not exist.");
        }

        final long offset = index * chunkSize;
        final byte[] keyBytes = key.getBytes();
        final String iv = generateSecureRandomString(12);
        final byte[] ivBytes = iv.getBytes();
        final File outputBaseDir = new File(inputFile.getPath()).getParentFile();

        assert outputBaseDir != null;

        if (!outputBaseDir.exists()) {
            outputBaseDir.mkdirs();
        }

        final File outputFile = new File(outputBaseDir, UUID.randomUUID().toString());
        final long inputFileSize = inputFile.length();

        if (inputFileSize < offset) {
            throw new Exception("Input file size too small or offset to big.");
        }

        try (FileInputStream fileInputStream = new FileInputSkipStream(inputFile, offset, 0); FileOutputStream fileOutputStream = new FileOutputStream(outputFile)) {
            final MessageDigest digest = MessageDigest.getInstance("SHA-512");
            final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            final SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            final GCMParameterSpec gcmSpec = new GCMParameterSpec(128, ivBytes);

            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            final int bufferSize = 1024;
            final byte[] buffer = new byte[bufferSize];
            int bytesRead;
            int bytesReadTotal = 0;

            fileOutputStream.write(ivBytes);
            digest.update(ivBytes);

            while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                if (bytesRead > 0) {
                    byte[] encryptedChunk = cipher.update(buffer, 0, bytesRead);

                    if (encryptedChunk != null) {
                        if (encryptedChunk.length > 0) {
                            fileOutputStream.write(encryptedChunk);
                            digest.update(encryptedChunk);
                        }
                    }

                    bytesReadTotal += bytesRead;

                    if (bytesReadTotal >= chunkSize) {
                        break;
                    }
                }
            }

            final byte[] finalEncryptedChunk = cipher.doFinal();

            if (finalEncryptedChunk != null) {
                if (finalEncryptedChunk.length > 0) {
                    fileOutputStream.write(finalEncryptedChunk);
                    digest.update(finalEncryptedChunk);
                }
            }

            return new Object[]{
                    outputFile,
                    bytesToHex(digest.digest())
            };
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "streamDecryptData error: " + e.getMessage());

            throw e;
        }
    }

    public static String encryptMetadata (String metadata, String key) throws Exception {
        final String iv = generateSecureRandomString(12);
        final byte[] transformedKey = hexToBytes(transformKey(key));
        final byte[] ivBytes = iv.getBytes();
        final byte[] metadataBytes = metadata.getBytes();

        final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        final SecretKeySpec keySpec = new SecretKeySpec(transformedKey, "AES");
        final GCMParameterSpec gcmSpec = new GCMParameterSpec(128, ivBytes);

        cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

        final byte[] encryptedBytes = cipher.doFinal(metadataBytes);

        return "002" + iv + Base64.getEncoder().encodeToString(encryptedBytes);
    }

    public static String hashFile (File inputFile, String hash) throws Exception {
        final MessageDigest digest = MessageDigest.getInstance(hash);

        try (FileInputStream fileInputStream = new FileInputStream(inputFile)) {
            final int bufferSize = 1024;
            final byte[] buffer = new byte[bufferSize];
            int bytesRead;

            while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                if (bytesRead > 0) {
                    digest.update(buffer);
                }
            }

            return bytesToHex(digest.digest());
        } catch (Exception e) {
            e.printStackTrace();

            Log.d("FilenDocumentsProvider", "streamDecryptData error: " + e.getMessage());

            throw e;
        }
    }

    public static String hashFn (String message) throws Exception {
        MessageDigest digestSHA512 = MessageDigest.getInstance("SHA-512");
        MessageDigest digestSHA1 = MessageDigest.getInstance("SHA-1");

        return bytesToHex(digestSHA1.digest(digestSHA512.digest(message.getBytes())));
    }

    public static String hash (String message, String hash) throws Exception {
        switch (hash) {
            case "SHA-384":
                MessageDigest digestSHA384 = MessageDigest.getInstance("SHA-384");

                return bytesToHex(digestSHA384.digest(message.getBytes()));
            case "SHA-256":
                MessageDigest digestSHA256 = MessageDigest.getInstance("SHA-256");

                return bytesToHex(digestSHA256.digest(message.getBytes()));
            case "SHA-1":
                MessageDigest digestSHA1 = MessageDigest.getInstance("SHA-1");

                return bytesToHex(digestSHA1.digest(message.getBytes()));
            case "MD5":
                MessageDigest digestMD5 = MessageDigest.getInstance("MD5");

                return bytesToHex(digestMD5.digest(message.getBytes()));
            case "MD2":
                MessageDigest digestMD2 = MessageDigest.getInstance("MD2");

                return bytesToHex(digestMD2.digest(message.getBytes()));
            case "MD4":
                MessageDigest digestMD4 = MessageDigest.getInstance("MD4");

                return bytesToHex(digestMD4.digest(message.getBytes()));
            default:
                MessageDigest digestSHA512 = MessageDigest.getInstance("SHA-512");

                return bytesToHex(digestSHA512.digest(message.getBytes()));
        }
    }

    public static String encryptMetadataPublicKey (String metadata, String publicKey) throws Exception {
        final byte[] keyBytes = Base64.getDecoder().decode(publicKey);
        final X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        final KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        final PublicKey importedKey = keyFactory.generatePublic(spec);
        final Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-512AndMGF1Padding");

        cipher.init(Cipher.ENCRYPT_MODE, importedKey);

        final byte[] encryptedData = cipher.doFinal(metadata.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(encryptedData);
    }

    public static String decryptFolderLinkKey (String metadata, String[] masterKeys) {
        for (final String masterKey: reverseStringArray(masterKeys)) {
            try {
                final String decrypted = decryptMetadata(metadata, masterKey);

                if (decrypted.length() > 16) {
                    return decrypted;
                }
            } catch (Exception e) {
                // Noop
            }
        }

        return "";
    }

    public static String[] reverseStringArray (String[] array) {
        int n = array.length;
        String[] reversedArray = new String[n];

        for (int i = 0; i < n; i++) {
            reversedArray[i] = array[n - i - 1];
        }

        return reversedArray;
    }

    public static byte[][] EVP_BytesToKey (int keyLen, int ivLen, MessageDigest md, byte[] salt, byte[] data, int count) {
        byte[][] both = new byte[2][];
        byte[] key = new byte[keyLen];
        int keyIndex = 0;

        byte[] iv = new byte[ivLen];
        int ivIndex = 0;

        both[0] = key;
        both[1] = iv;

        byte[] md_buf = null;
        int nkey = keyLen;
        int niv = ivLen;
        int i = 0;

        if (data == null) {
            return both;
        }

        int addmd = 0;

        do {
            md.reset();

            if (addmd++ > 0) {
                md.update(md_buf);
            }

            md.update(data);

            if (null != salt) {
                md.update(salt, 0, 8);
            }

            md_buf = md.digest();

            for (i = 1; i < count; i++) {
                md.reset();
                md.update(md_buf);
                md_buf = md.digest();
            }

            i = 0;

            if (nkey > 0) {
                for (; ; ) {
                    if (nkey == 0) break;
                    if (i == md_buf.length) break;

                    key[keyIndex++] = md_buf[i];

                    nkey--;
                    i++;
                }
            }

            if (niv > 0 && i != md_buf.length) {
                for (; ; ) {
                    if (niv == 0) break;
                    if (i == md_buf.length) break;

                    iv[ivIndex++] = md_buf[i];

                    niv--;
                    i++;
                }
            }

        } while (nkey != 0 || niv != 0);

        for (i = 0; i < md_buf.length; i++) {
            md_buf[i] = 0;
        }

        return both;
    }

    public static String transformKey (String key) throws Exception {
        return deriveKeyFromPassword(key, key, 256, 1, "SHA512");
    }

    public static String deriveKeyFromPassword (String password, String salt, int bitLength, int iterations, String hash) throws Exception {
        return pbkdf2(password, salt, bitLength, iterations, hash);
    }

    public static int toDigit (char hexChar) {
        int digit = Character.digit(hexChar, 16);

        if(digit == -1) {
            throw new IllegalArgumentException( "Invalid Hexadecimal Character: " + hexChar);
        }

        return digit;
    }

    public static byte[] hexToBytes (String hexString) {
        if (hexString.length() % 2 == 1) {
            throw new IllegalArgumentException("Invalid hexadecimal String supplied.");
        }

        byte[] bytes = new byte[hexString.length() / 2];

        for (int i = 0; i < hexString.length(); i += 2) {
            bytes[i / 2] = hexToByte(hexString.substring(i, i + 2));
        }

        return bytes;
    }

    public static byte hexToByte (String hexString) {
        int firstDigit = toDigit(hexString.charAt(0));
        int secondDigit = toDigit(hexString.charAt(1));

        return (byte) ((firstDigit << 4) + secondDigit);
    }

    public static String byteToHex (byte num) {
        char[] hexDigits = new char[2];

        hexDigits[0] = Character.forDigit((num >> 4) & 0xF, 16);
        hexDigits[1] = Character.forDigit((num & 0xF), 16);

        return new String(hexDigits);
    }

    public static String bytesToHex (byte[] bytes) {
        StringBuilder hexStringBuffer = new StringBuilder();

        for (byte aByte: bytes) {
            hexStringBuffer.append(byteToHex(aByte));
        }

        return hexStringBuffer.toString();
    }

    public static String pbkdf2 (String password, String salt, int bitLength, int iterations, String hash) throws Exception {
        String algorithm = "PBKDF2WithHmac" + hash.toUpperCase();

        KeySpec keySpec = new PBEKeySpec(password.toCharArray(), salt.getBytes(), iterations, bitLength);
        SecretKeyFactory keyFactory = SecretKeyFactory.getInstance(algorithm);

        byte[] keyBytes = keyFactory.generateSecret(keySpec).getEncoded();

        return bytesToHex(keyBytes);
    }
}
