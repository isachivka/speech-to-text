"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface FileResultItemProps {
  file: File;
}

interface FileResult {
  response: string;
  loading: boolean;
}

const FileResultItem = ({ file }: FileResultItemProps) => {
  const [result, setResult] = useState<FileResult>({
    response: "",
    loading: true,
  });
  const [copyButtonText, setCopyButtonText] = useState("Copy");

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonText("Copied!");
      setTimeout(() => setCopyButtonText("Copy"), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      setCopyButtonText("Error");
      setTimeout(() => setCopyButtonText("Copy"), 2000);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.body) {
          throw new Error("Empty response from server");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = "";
        let done = false;

        while (!done) {
          const { done: doneReading, value } = await reader.read();
          done = doneReading;
          if (value) {
            resultText += decoder.decode(value, { stream: !done });
            // Update state after receiving each chunk of data
            setResult({ response: resultText, loading: false });
          }
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setResult({
          response: `Error: ${error}`,
          loading: false,
        });
      }
    };

    fetchData();
  }, [file]);

  return (
    <div className={styles.resultItem}>
      <div className={styles.resultHeader}>
        <span className={styles.resultTitle}>{file.name}</span>
        {!result.loading && (
          <button
            className={styles.copyButton}
            onClick={() => handleCopy(result.response)}
          >
            {copyButtonText}
          </button>
        )}
      </div>
      <div className={styles.resultContent}>
        {result.loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <pre className={styles.resultText}>{result.response}</pre>
        )}
      </div>
    </div>
  );
};

export default FileResultItem;
