package io.filen.app;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

public class FileInputSkipStream extends FileInputStream {
    private final long skippedBytesAtEnd;
    private long bytesRead;
    private final long totalBytesToRead;

    public FileInputSkipStream (File inputFile, long skippedBytesAtStart, long skippedBytesAtEnd) throws IOException {
        super(inputFile);

        this.skippedBytesAtEnd = skippedBytesAtEnd;
        this.bytesRead = 0;

        super.skip(skippedBytesAtStart);

        this.totalBytesToRead = inputFile.length() - skippedBytesAtEnd;
    }

    @Override
    public int read () throws IOException {
        if (bytesRead >= totalBytesToRead) {
            return -1;
        }

        int byteData = super.read();

        if (byteData != -1) {
            bytesRead = bytesRead + byteData;
        }

        return byteData;
    }

    @Override
    public int read (byte[] b, int off, int len) throws IOException {
        if (bytesRead >= totalBytesToRead) {
            return -1;
        }

        long bytesLeft = totalBytesToRead - bytesRead;

        if (len > bytesLeft) {
            len = (int) bytesLeft;
        }

        int result = super.read(b, off, len);

        if (result != -1) {
            bytesRead += result;
        }

        return result;
    }

    @Override
    public int available () throws IOException {
        long actualAvailable = super.available() - skippedBytesAtEnd - bytesRead;

        return actualAvailable > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) actualAvailable;
    }
}
