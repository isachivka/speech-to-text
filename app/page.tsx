"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [results, setResults] = useState<{ name: string; response: string; loading: boolean }[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);

    uploadedFiles.forEach(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      setResults((prevResults) => [
        ...prevResults,
        { name: file.name, response: "", loading: true },
      ]);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let resultText = "";

        while (true) {
          const { done, value } = await reader?.read() || {};
          if (done) break;
          resultText += decoder.decode(value, { stream: true });
          setResults((prevResults) =>
            prevResults.map((result) =>
              result.name === file.name
                ? { ...result, response: resultText, loading: false }
                : result
            )
          );
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    });
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <input type="file" accept=".wav,.m4a" multiple onChange={handleFileUpload} />
        <div className={styles.results}>
          {results.map((result, index) => (
            <div key={index} className={styles.resultItem}>
              <div className={styles.resultTitle}>{result.name}</div>
              {result.loading ? (
                <div className={styles.loading}>Loading...</div>
              ) : (
                <div className={styles.resultText}><pre>{result.response}</pre></div>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}
