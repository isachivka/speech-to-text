"use client";

import { useState, ChangeEvent } from "react";
import styles from "./page.module.css";
import FileResultItem from "./FileResultItem";

interface FileData {
  id: string;
  file: File;
}

export default function Home() {
  const [files, setFiles] = useState<FileData[]>([]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const newFiles = uploadedFiles.map((file) => ({
      id: `${file.name}_${Date.now()}`,
      file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Speech to text</h1>
        <input
          type="file"
          accept=".wav,.m4a"
          multiple
          onChange={handleFileUpload}
          className={styles.fileInput}
        />
        <div className={styles.results}>
          {files.map((fileData) => (
            <FileResultItem key={fileData.id} file={fileData.file} />
          ))}
        </div>
      </main>
    </div>
  );
}
