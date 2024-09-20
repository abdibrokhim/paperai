// src/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { faArrowDown, faLock, faUsers, faWandSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Notification from '../lib/notify';
import { SignedIn, UserButton } from '@clerk/nextjs';
import CleanMode from './modes/cleanMode/CleanMode';
import PrivateMode from './modes/privateMode/PrivateMode';
import CollaborativeMode from './modes/collaborativeMode/CollaborativeMode';
import { UserInfo, FileData } from '../lib/types';
import loader from './components/loader';
import { addFile, getFileByPk } from '../lib/files';

import { app } from './firebaseConfig';
const db = getFirestore(app);

export default function Home() {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'success' | 'info';
  } | null>(null);
  const [isClearMode, setIsClearMode] = useState(true);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);
  const [newURL, setNewURL] = useState<string>(''); // State for new input URL
  const [paperURL, setPaperURL] = useState<string>('https://arxiv.org/pdf/2403.08715'); // Paper URL state 1) https://arxiv.org/pdf/2401.05268 2) https://arxiv.org/pdf/2406.14283
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingUser, setIsLoadingUser] = React.useState(false);
  const [refetchUserInfo, setRefetchUserInfo] = React.useState(false);
  const [paperId, setPaperId] = React.useState<string>('');

  const { isLoaded, isSignedIn, user } = useUser();

  const checkAndSetUser = async () => {
    setIsLoadingUser(true);
    console.log('Checking user in Firestore...');
    if (!user) return;
    console.log('User id:', user.id);
    try {
      const userRef = doc(db, 'users', user.id);

      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('User exists in Firestore, getting data...');
        // User exists, get data
        const userData: UserInfo = docSnap.data() as UserInfo;
        setUserInfo(userData);
      } else {
        console.log('User does not exist in Firestore, creating...');
        // User does not exist, create with default generated ID
        const newUser: UserInfo = {
          id: user.id,
          name: user.firstName || '' + user.lastName || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.emailAddresses[0]?.emailAddress || '',
        };

        await setDoc(userRef, newUser);
        setUserInfo(newUser);
      }
    } catch (error) {
      console.error('Error checking or creating user in Firestore:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Show notification
  const triggerNotification = (
    nMessage: string,
    nType: 'error' | 'success' | 'info'
  ) => {
    setNotification({ message: nMessage, type: nType });
  };

  // Modes
  const handleOpenClearMode = () => {
    setIsLoading(true);
    setIsClearMode(true);
    setIsPrivateMode(false);
    setIsCollaborativeMode(false);
    setIsLoading(false);
  };

  const handleOpenPrivateMode = async () => {
    setIsLoading(true);
    await checkAndSetUser();
    setIsClearMode(false);
    setIsPrivateMode(true);
    setIsCollaborativeMode(false);
    setIsLoading(false);
  };

  const handleOpenCollaborativeMode = async () => {
    setIsLoading(true);
    await checkAndSetUser();
    setIsClearMode(false);
    setIsPrivateMode(false);
    setIsCollaborativeMode(true);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      checkAndSetUser();
    }
  }, [isSignedIn, isLoaded]);

  // Check if the URL is valid
  const isValidURL = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'arxiv.org' && parsedUrl.pathname.startsWith('/pdf/');
    } catch (error) {
      return false;
    }
  };

  // Function to handle the URL update
  const handleUpdate = () => {
    if (newURL.trim() && isValidURL(newURL)) {
      setPaperURL(newURL);
      localStorage.setItem('paperURL', newURL); // Update localStorage if needed elsewhere
      // triggerNotification('Proceeding with Paper: ' + newURL, 'info');
      setNewURL(''); // Clear the input field
    } else {
      // triggerNotification('Invalid URL. Please enter a valid arXiv PDF URL.', 'error');
    }
  };

  // Initialize paperURL from localStorage if available
  useEffect(() => {
    const storedURL = localStorage.getItem('paperURL');
    if (storedURL) {
      setPaperURL(storedURL);
    }
  }, []);

  // Fetch file data on paperURL change and on first render
  useEffect(() => {
    const fetchFileData = async () => {
      if (paperURL) {
        const pk = paperURL.substring(paperURL.lastIndexOf('/') + 1);
        let fileData = await getFileByPk(pk);

        if (fileData) {
          console.log('File exists, setting paperId...');
          // File exists, set paperId
          setPaperId(fileData.fileId);
        } else {
          console.log('File does not exist, adding...');
          // File does not exist, add it
          fileData = await addFile(paperURL);
          setPaperId(fileData.fileId);
        }
      }
    };

    fetchFileData();
  }, [paperURL]);

  return (
    <>
      {/* Show notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Show available modes */}
      {/* Show Clean Mode */}
      {isClearMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <CleanMode paperURL={paperURL} />
        )
      )}
      {/* Show Private Mode */}
      {isPrivateMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <PrivateMode paperURL={paperURL} userInfo={userInfo!} paperId={paperId} />
        )
      )}
      {/* Show Collaborative Mode */}
      {isCollaborativeMode && (
        isLoading ? (
          <div className="flex justify-center items-center m-auto mt-8 text-xl">{loader()}</div>
        ) : (
          <CollaborativeMode paperURL={paperURL} userInfo={userInfo!} paperId={paperId} />
        )
      )}

      {/* Add new paper */}
      <div className="flex flex-row gap-3 absolute top-[8px] left-[100px] items-center">
        {/* Paper URL input */}
        <div>
          <input
            value={newURL}
            onChange={(e) => setNewURL(e.target.value)}
            autoComplete="off"
            type="text"
            name="newURL"
            placeholder="Enter your Paper URL"
            className="placeholder:text-[#747474] placeholder:text-sm text-sm w-[300px] px-2 py-1 text-[#747474] bg-white rounded border border-[#eaeaea] focus:outline-none focus:border-[#747474]"
          />
        </div>
        {/* Submit button */}
        <div className="relative flex items-center group">
          <button
            disabled={!newURL || !isValidURL(newURL)}
            onClick={handleUpdate}
            className={`flex items-center justify-center py-2 px-3 rounded-md text-black bg-[#eaeaea] ${
              !newURL || !isValidURL(newURL)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#747474] hover:text-white cursor-pointer'
            }`}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
          <span className="absolute w-[130px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            Proceed with Paper
          </span>
        </div>
      </div>

      {/* Mode selection buttons */}
      <div className="flex flex-col gap-3 absolute top-[300px] left-[16px] bg-white p-1 shadow-md items-center">
        {/* Clear Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenClearMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faWandSparkles} />
          </button>
          <span className="absolute w-[80px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            Clear Mode
          </span>
        </div>
        {/* Private Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenPrivateMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faLock} />
          </button>
          <span className="absolute w-[90px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            Private Mode
          </span>
        </div>
        {/* Collaborative Mode */}
        <div className="relative flex items-center group">
          <button
            onClick={handleOpenCollaborativeMode}
            className="flex items-center justify-center p-2 rounded-md hover:bg-[#eaeaea] text-black cursor-pointer"
          >
            <FontAwesomeIcon icon={faUsers} />
          </button>
          <span className="absolute w-[120px] text-xs left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md bg-[#747474] text-white px-2 py-1">
            Collaborative Mode
          </span>
        </div>
      </div>

      {/* Account settings */}
      <div className="absolute bottom-[20px] left-[20px]">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </>
  );
}