import React, { useEffect, useRef } from 'react';
import CollaborativeViewSDKClient from '../../components/CollaborativeViewSDKClient';
import { UserInfo } from '../../../lib/types';

import { Annotation } from '../../../lib/types';
import { createCollaboration, fetchAllUserAnnotations, fetchUserAnnotations, addAnnotation, updateAnnotation, deleteAnnotation } from '../../../lib/coannotations';

interface CollaborativeModeProps {
  paperURL: string;
  userInfo: UserInfo;
  paperId: string;
}

const CollaborativeMode: React.FC<CollaborativeModeProps> = ({ paperURL, userInfo, paperId }) => {
  const viewSDKClientRef = useRef<CollaborativeViewSDKClient | null>(null);
  const [selectedText, setSelectedText] = React.useState<string>('');
  const [showButton, setShowButton] = React.useState<boolean>(false);
  const [response, setResponse] = React.useState<string>('');
  const collaborationId = "2rBZ7BfXEpoweXaLYGVs"; // default collaboration ID

  const viewerConfig = {
    /* Viewer configuration options */
    showAnnotationTools: true,
    enableAnnotationAPIs: true,
    enableFormFilling: true,
    showDownloadPDF: true,
    showPrintPDF: true,
    showZoomControl: true,
    defaultViewMode: '',
  };

  const userId = userInfo.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const viewSDKClient = new CollaborativeViewSDKClient(paperURL, userInfo);
    viewSDKClientRef.current = viewSDKClient;

    viewSDKClient.ready().then(() => {
      const viewerConfig = {
        enableAnnotationAPIs: true,
        includePDFAnnotations: true,
      };

      viewSDKClient.previewFile('pdf-div', viewerConfig).then((adobeViewer: any) => {
        adobeViewer.getAnnotationManager().then((annotationManager: any) => {
          // Register event listeners
          annotationManager.registerEventListener(handleAnnotationEvent, {
            listenOn: ['ANNOTATION_ADDED', 'ANNOTATION_UPDATED', 'ANNOTATION_DELETED'],
          });

          // Fetch annotations from Firestore and add them to the PDF
          if (collaborationId) {
            fetchAllUserAnnotations(collaborationId, paperId)
                .then((annotations) => {
                annotationManager.addAnnotations(annotations).then(() => {
                    console.log('Annotations added to the PDF from Firestore.');
                });
                })
                .catch((error) => {
                console.error('Error fetching annotations from Firestore:', error);
            });
            };
          });
        });
      viewSDKClient.registerUserProfileApiHandler();
    });

    return () => {
      if (viewSDKClientRef.current) {
        viewSDKClientRef.current = null;
      }
    };
  }, [paperURL, userId, paperId]);

  const handleAnnotationEvent = (event: any) => {
    const annotation = event.data as Annotation;
    if (!userId) return;

    switch (event.type) {
      case 'ANNOTATION_ADDED':
        addAnnotation(collaborationId, userId, paperId, annotation)
          .then(() => {
            console.log('Annotation added to Firestore.');
          })
          .catch((error) => {
            console.error('Error adding annotation to Firestore:', error);
          });
        break;
      case 'ANNOTATION_UPDATED':
        updateAnnotation(collaborationId, userId, paperId, annotation)
          .then(() => {
            console.log('Annotation updated in Firestore.');
          })
          .catch((error) => {
            console.error('Error updating annotation in Firestore:', error);
          });
        break;
      case 'ANNOTATION_DELETED':
        deleteAnnotation(collaborationId, userId, paperId, annotation.id)
          .then(() => {
            console.log('Annotation deleted from Firestore.');
          })
          .catch((error) => {
            console.error('Error deleting annotation from Firestore:', error);
          });
        break;
      default:
        break;
    }
  };

  const handleTextSelection = (event: any) => {
    console.log('Selected text:', event.data);
    const selectedContent = event.data.selectedText;
    if (selectedContent) {
      setSelectedText(selectedContent);
      setShowButton(true);
    } else {
      // setSelectedText('');
      setShowButton(false);
    }
  };

  const handleGenerateText = async (inputText: string) => {
    console.log('Generating text...');
    try {
      const res = await fetch('/api/generateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputText }),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch');
      }
  
      const data = await res.json();
      const clearedData = data.results[0].generated_text.replace(/\n/g, ' ').replace(/"/g, '');
      setResponse(clearedData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <div id="pdf-div" className="full-window-div" />
    </>
    );
  };

export default CollaborativeMode;