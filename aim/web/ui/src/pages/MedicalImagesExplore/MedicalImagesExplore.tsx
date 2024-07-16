/* eslint-disable react-hooks/rules-of-hooks */
import React from 'react';
import _ from 'lodash-es';
import ErrorBoundary from 'components/ErrorBoundary/ErrorBoundary';
import './MedicalImagesExplore.scss';

function MedicalImagesExplore(): React.FunctionComponentElement<React.ReactNode> {
  return (
    <ErrorBoundary>
      <div className='ImagesExplore__container' >test</div>
    </ErrorBoundary>
  );
}
export default MedicalImagesExplore;
