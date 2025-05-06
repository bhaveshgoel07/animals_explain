// src/components/DropdownMenu.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../DropdownMenu.module.css'; // We'll create this CSS file

interface DropdownMenuProps {
  animals: string[];
  selectedAnimal: string;
  onAnimalSelect: (animal: string) => void;
  onAddCustomAnimal: (animal: string) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  animals,
  selectedAnimal,
  onAnimalSelect,
  onAddCustomAnimal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customAnimal, setCustomAnimal] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (animal: string) => {
    onAnimalSelect(animal);
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleAddOwn = () => {
    setShowCustomInput(true);
    // Don't close dropdown immediately, let user type
  };

  const handleCustomSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (customAnimal.trim()) {
      onAddCustomAnimal(customAnimal.trim());
      setCustomAnimal('');
      setIsOpen(false);
      setShowCustomInput(false);
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If custom input was shown but not submitted, hide it
        if (showCustomInput && !customAnimal.trim()) {
            setShowCustomInput(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef, showCustomInput, customAnimal]);


  const variants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
    closed: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 },
    },
  };

  const itemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24, staggerChildren: 0.05 }
    },
    closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
  };


  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button onClick={toggleDropdown} className={styles.dropdownButton}>
        Metaphor: {selectedAnimal || 'Select Animal'}
        <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className={styles.arrowIcon}
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className={styles.dropdownList}
            initial="closed"
            animate="open"
            exit="closed"
            variants={variants}
          >
            {animals.map((animal) => (
              <motion.li
                key={animal}
                onClick={() => handleSelect(animal)}
                className={`${styles.dropdownItem} ${selectedAnimal === animal ? styles.selected : ''}`}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', x: 5 }}
                variants={itemVariants}
              >
                {animal}
              </motion.li>
            ))}
            <motion.li
              onClick={handleAddOwn}
              className={`${styles.dropdownItem} ${styles.addOwnItem}`}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', x: 5 }}
              variants={itemVariants}
            >
              ✨ Add Your Own...
            </motion.li>
            {showCustomInput && (
              <motion.li
                className={styles.customInputItem}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <form onSubmit={handleCustomSubmit} className={styles.customForm}>
                  <input
                    type="text"
                    value={customAnimal}
                    onChange={(e) => setCustomAnimal(e.target.value)}
                    placeholder="E.g., Tiny Dragons"
                    className={styles.customInput}
                    autoFocus
                  />
                  <button type="submit" className={styles.customSubmitButton}>
                    Add
                  </button>
                </form>
              </motion.li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropdownMenu;