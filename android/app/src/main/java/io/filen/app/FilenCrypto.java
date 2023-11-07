package io.filen.app;

import android.util.Log;

import javax.annotation.Nullable;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEParameterSpec;
import java.security.MessageDigest;
import java.io.UnsupportedEncodingException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import java.security.SecureRandom;
import java.security.AlgorithmParameters;
import java.security.NoSuchAlgorithmException;
import java.security.InvalidKeyException;
import java.util.List;

import org.json.*;

public class FilenCrypto {
    @Nullable
    public static FileMetadata decryptFileMetadata (String metadata, String[] masterKeys) {
        for (String masterKey: reverseStringArray(masterKeys)) {
            try {
                JSONObject json = new JSONObject(decryptMetadata(metadata, masterKey));
                String name = json.getString("name");

                if (name.length() > 0) {
                    FileMetadata fileMetadata = new FileMetadata();

                    fileMetadata.name = json.getString("name");
                    fileMetadata.key = json.getString("key");

                    try {
                        fileMetadata.size = json.getInt("size");
                    } catch (Exception e) {
                        fileMetadata.size = 0;
                    }

                    try {
                        fileMetadata.mime = json.getString("mime");
                    } catch (Exception e) {
                        fileMetadata.mime = "";
                    }

                    try {
                        fileMetadata.lastModified = json.getInt("lastModified");
                    } catch (Exception e) {
                        fileMetadata.lastModified = (int) System.currentTimeMillis();
                    }

                    try {
                        fileMetadata.hash = json.getString("hash");
                    } catch (Exception e) {
                        fileMetadata.hash = "";
                    }

                    return fileMetadata;
                }
            } catch (Exception e) {
                continue;
            }
        }

        return null;
    }

    @Nullable
    public static String decryptFolderName (String metadata, String[] masterKeys) {
        for (String masterKey: reverseStringArray(masterKeys)) {
            try {
                JSONObject json = new JSONObject(decryptMetadata(metadata, masterKey));
                String name = json.getString("name");

                if (name.length() > 0) {
                    return name;
                }
            } catch (Exception e) {
                continue;
            }
        }

        return null;
    }

    public static String decryptMetadata (String metadata, String key) throws Exception {
        if (metadata.startsWith("U2FsdGVk")) {
            byte[] encryptedData = Base64.getDecoder().decode(metadata);
            byte[] salt = Arrays.copyOfRange(encryptedData, 8, 16);
            byte[] cipherText = Arrays.copyOfRange(encryptedData, 16, encryptedData.length);
            byte[][] keyAndIV = EVP_BytesToKey(32, 16, MessageDigest.getInstance("MD5"), salt, key.getBytes(), 1);
            byte[] keyBytes = keyAndIV[0];
            byte[] ivBytes = keyAndIV[1];

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new IvParameterSpec(ivBytes));

            return new String(cipher.doFinal(cipherText));
        } else {
            String version = metadata.substring(0, 3);

            if ("002".equals(version)) {
                byte[] transformedKey = hexToBytes(transformKey(key));
                byte[] metadataBytes = metadata.getBytes();
                byte[] iv = Arrays.copyOfRange(metadataBytes, 3, 15);
                byte[] cipherText = Base64.getDecoder().decode(Arrays.copyOfRange(metadataBytes, 15, metadataBytes.length));

                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                GCMParameterSpec gcmParameterSpec = new GCMParameterSpec(128, iv);
                SecretKeySpec keySpec = new SecretKeySpec(transformedKey, "AES");
                cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmParameterSpec);

                return new String(cipher.doFinal(cipherText));
            }

            throw new IllegalArgumentException("Unsupported version.");
        }
    }

    public static String[] reverseStringArray (String[] array) {
        int n = array.length;
        String[] reversedArray = new String[n];

        for (int i = 0; i < n; i++) {
            reversedArray[i] = array[n - i - 1];
        }

        return reversedArray;
    }

    public static byte[] concatByteArrays (byte[]...arrays) {
        int totalLength = 0;

        for (int i = 0; i < arrays.length; i++){
            totalLength += arrays[i].length;
        }

        byte[] result = new byte[totalLength];

        int currentIndex = 0;

        for (int i = 0; i < arrays.length; i++){
            System.arraycopy(arrays[i], 0, result, currentIndex, arrays[i].length);

            currentIndex += arrays[i].length;
        }

        return result;
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

        for (; ; ) {
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

            if (nkey == 0 && niv == 0) {
                break;
            }
        }

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

    public static String byteToHex(byte num) {
        char[] hexDigits = new char[2];

        hexDigits[0] = Character.forDigit((num >> 4) & 0xF, 16);
        hexDigits[1] = Character.forDigit((num & 0xF), 16);

        return new String(hexDigits);
    }

    public static String bytesToHex (byte[] bytes) {
        StringBuffer hexStringBuffer = new StringBuffer();

        for (int i = 0; i < bytes.length; i++) {
            hexStringBuffer.append(byteToHex(bytes[i]));
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
