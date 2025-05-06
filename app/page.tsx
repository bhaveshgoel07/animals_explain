'use client';

import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import DropdownMenu from './components/DropdownMenu';
import styles from './Home.module.css';
import { motion, AnimatePresence } from 'framer-motion';

interface Slide {
  id: string;
  text: string;
  imageUrl?: string;
}

const initialAnimals = ['Tiny Cats', 'Tiny Dogs', 'Tiny Birds', 'Miniature Monkeys'];
const examplePrompts = [
  "Explain how a computer works.",
  "What is photosynthesis?",
  "Tell me about the water cycle.",
];

export default function HomePage() {
  const [userInput, setUserInput] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [availableAnimals, setAvailableAnimals] = useState<string[]>(initialAnimals);
  const [selectedAnimal, setSelectedAnimal] = useState<string>(initialAnimals[0]);

  const slideshowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const createMarkup = (htmlContent: string) => {
    if (typeof window !== 'undefined') {
      return { __html: DOMPurify.sanitize(htmlContent) };
    }
    return { __html: '' };
  };

  const parseError = (errorText: string): string => {
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) return parsed.error;
    } catch (e) {
      const regex = /{"error":(.*)}/gm;
      const m = regex.exec(errorText);
      if (m && m[1]) {
        try {
          const e = JSON.parse(m[1]);
          return e.message;
        } catch (innerE) { /* ignore */ }
      }
    }
    return errorText;
  };
  

  const generateSlides = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);
    setSlides([]);
  
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, animal: selectedAnimal }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // Buffer to hold incomplete lines
      let currentSlideText = '';
      let currentSlideImage: string | undefined = undefined;

      // Clear input after successful request initiation
      setUserInput('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining data in the buffer when the stream is done
          if (buffer.trim()) {
            try {
              const part = JSON.parse(buffer.trim());
              if (part.error) throw new Error(part.error);
              if (part.text) {
                currentSlideText += part.text;
              } else if (part.inlineData && part.inlineData.data) {
                currentSlideImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
            } catch (e) {
              console.error("Error parsing remaining buffer:", buffer, e);
              setError(prev => prev ? `${prev}\nError parsing final data: ${(e as Error).message}` : `Error parsing final data: ${(e as Error).message}`);
            }
          }
          break; // Exit the loop
        }

        // Add new data to the buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from the buffer
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, newlineIndex).trim();
          buffer = buffer.substring(newlineIndex + 1);

          if (line) {
            try {
              const part = JSON.parse(line);

              if (part.error) {
                throw new Error(part.error);
              }

              if (part.text) {
                currentSlideText += part.text;
              } else if (part.inlineData && part.inlineData.data) {
                currentSlideImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }

              if (currentSlideText && currentSlideImage) {
                const newSlide: Slide = {
                  id: `slide-${Date.now()}-${Math.random()}`,
                  text: await marked.parse(currentSlideText.trim()),
                  imageUrl: currentSlideImage,
                };
                setSlides(prevSlides => [...prevSlides, newSlide]);
                currentSlideText = '';
                currentSlideImage = undefined;
              }
            } catch (e) {
              console.error("Error parsing streamed part:", line, e);
              setError(prev => prev ? `${prev}\nError processing part: ${(e as Error).message}` : `Error processing part: ${(e as Error).message}`);
            }
          }
        }
      }

      // After the loop, handle any remaining text/image that formed the last slide
      if (currentSlideText || currentSlideImage) {
        const finalSlideText = currentSlideText.trim() || (currentSlideImage ? " " : ""); // Add space if only image for marked
        const newSlide: Slide = {
          id: `slide-${Date.now()}-${Math.random()}`,
          text: await marked.parse(finalSlideText),
          imageUrl: currentSlideImage,
        };
        setSlides(prevSlides => [...prevSlides, newSlide]);
      }

    } catch (e: any) {
      console.error("Generation Error:", e);
      setError(`Something went wrong: ${parseError(e.message || String(e))}`);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateSlides(userInput); // Use the current userInput state
    }
  };

  const handleExampleClick = (prompt: string) => {
    // Set the user input state here, then call generateSlides
    // This ensures consistency if generateSlides clears the input later
    setUserInput(prompt); 
    generateSlides(prompt);
  };

  const handleAnimalSelect = (animal: string) => {
    setSelectedAnimal(animal);
  };

  const handleAddCustomAnimal = (newAnimal: string) => {
    if (!availableAnimals.includes(newAnimal)) {
      setAvailableAnimals(prev => [...prev, newAnimal]);
    }
    setSelectedAnimal(newAnimal);
  };

  useEffect(() => {
    if (slideshowRef.current) {
      slideshowRef.current.scrollTop = slideshowRef.current.scrollHeight;
    }
  }, [slides]);

  const slideVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.2,
        type: 'spring',
        stiffness: 100,
        damping: 12
      },
    }),
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
  };


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.h1 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
        >
          Story time with cute animals!!
        </motion.h1>
        <DropdownMenu
          animals={availableAnimals}
          selectedAnimal={selectedAnimal}
          onAnimalSelect={handleAnimalSelect}
          onAddCustomAnimal={handleAddCustomAnimal}
        />
      </header>

      <main className={styles.mainContent}>
        <div className={styles.inputArea}>
          <textarea
            id="input"
            ref={inputRef}
            value={userInput} // Controlled component
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What story shall we tell today? (e.g., Explain photosynthesis)"
            disabled={isLoading}
            className={styles.userInput}
          />
          <button 
            onClick={() => generateSlides(userInput)} // Use current userInput state
            disabled={isLoading || !userInput.trim()} 
            className={styles.generateButton}
          >
            {isLoading ? (
              <div className={styles.loader}></div>
            ) : (
              'Generate Story'
            )}
          </button>
        </div>
        
        <div className={styles.examples}>
          <p>Or try an example:</p>
          <ul>
            {examplePrompts.map((prompt, index) => (
              <motion.li 
                key={index} 
                onClick={() => !isLoading && handleExampleClick(prompt)}
                whileHover={{ scale: 1.05, color: '#8A2BE2' }}
                whileTap={{ scale: 0.95 }}
              >
                {prompt}
              </motion.li>
            ))}
          </ul>
        </div>

        {error && <div id="error" className={styles.error} dangerouslySetInnerHTML={createMarkup(error)} />}

        <div id="slideshow" ref={slideshowRef} className={styles.slideshow}>
          <AnimatePresence>
            {slides.map((slide, index) => (
              <motion.div 
                key={slide.id} 
                className={styles.slide}
                custom={index}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={slideVariants}
                layout
              >
                {slide.imageUrl && (
                  <motion.img 
                    src={slide.imageUrl} 
                    alt="Generated illustration" 
                    initial={{ opacity: 0, scale: 0.8}}
                    animate={{ opacity: 1, scale: 1}}
                    transition={{ delay: index * 0.2 + 0.1, duration: 0.5}}
                  />
                )}
                <div className={styles.caption} dangerouslySetInnerHTML={createMarkup(slide.text)} />
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && slides.length === 0 && (
            <div className={styles.loadingPlaceholder}>
              <p>Generating your story with {selectedAnimal}...</p>
              <div className={styles.pulsingDots}>
                <div></div><div></div><div></div>
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className={styles.footer}>
        <p>Powered by Google Gemini & Next.js</p>
      </footer>
    </div>
  );
}