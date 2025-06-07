import * as fs from "fs";

// Wraps a file, handling reading and watching that file.

export class FileWrapper {
    path: string;
    callback: (data: Buffer, filename: string | null) => void;
    offset: number = 0;
    buffer: Buffer;

    constructor(path: string, wipe: boolean, callback: (data: Buffer, filename: string | null) => void) {
        this.path = path;
        this.callback = callback;

        if (wipe)
            fs.writeFileSync(path, "", { encoding: "utf8" });

        fs.watch(path, { encoding: "utf8" }, (e: fs.WatchEventType, fn: string | null) => this.readNewData(e, fn));

        this.buffer = Buffer.alloc(1024);
    }

    readNewData(eventType: fs.WatchEventType, filename: string | null) {
        if (eventType != "change")
            return;

        const fd = fs.openSync(this.path, "r+");

        let len: number;
        const bufs: Buffer[] = [];

        do {
            len = fs.readSync(fd, this.buffer, 0, 1024, this.offset);
            this.offset += len;

            if (len == 0)
                break;

            // console.log(`Read ${len} bytes from ${filename}: ${this.buffer.toString("utf8", 0, len)}`);

            const temp = Buffer.alloc(len);
            this.buffer.copy(temp);
            bufs.push(temp);
        } while (len == 1024);

        if (bufs.length == 0)
            return;

        this.callback(Buffer.concat(bufs), filename);
    }
}
