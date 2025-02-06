"use client";

import { useEffect, useState, useRef } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const hasFetched = useRef(false);

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
    if (hasFetched.current) return;
    hasFetched.current = true;

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
            // Обновляем текст, но не меняем loading на false, пока не закончится поток
            setResult((prev) => ({ ...prev, response: resultText }));
          }
        }
        setResult((prev) => ({ ...prev, loading: false }));
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

  // Иконка статуса: ⏳ до завершения, ✅ после завершения
  const statusIcon = result.loading ? "⏳" : "✅";

  return (
    <div className={styles.resultItem}>
      {/* Заголовок кликабелен для переключения свернутого/развернутого состояния */}
      <div
        className={styles.resultHeader}
        onClick={() => setExpanded((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        <span className={styles.resultTitle}>{file.name}</span>
        <span className={styles.statusIcon}>{statusIcon}</span>
        <button
          className={styles.copyButton}
          onClick={(e) => {
            // Предотвращаем переключение свернутости при клике по кнопке
            e.stopPropagation();
            handleCopy(result.response);
          }}
        >
          {copyButtonText}
        </button>
      </div>
      {expanded && (
        <div className={styles.resultContent}>
          {result.response ? (
            <pre className={styles.resultText}>{result.response}</pre>
          ) : (
            <div className={styles.loading}>Loading...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileResultItem;
