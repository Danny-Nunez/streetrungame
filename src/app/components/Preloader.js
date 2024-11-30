// ./src/app/components/Preloader.js

import React from 'react';
import styles from './Preloader.module.css'; // Import the CSS module

const Preloader = ({ progress }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.spinner}></div>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
        </div>
        <p className={styles.text}>Loading... {progress}%</p>
      </div>
    </div>
  );
};

export default Preloader;
