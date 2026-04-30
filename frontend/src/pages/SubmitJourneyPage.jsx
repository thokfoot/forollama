import React from 'react';
import Navbar from '../components/UI/Navbar';
import Footer from '../components/UI/Footer';
import JourneyMapper from '../components/Interactive/JourneyMapper';

const SubmitJourneyPage = () => {
    return (
        <div className="box-border flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden pw-page-bg">
            <Navbar />
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto page-scroll-below-nav">
                <div className="flex w-full min-w-0 flex-col" style={{ minHeight: 'calc(100dvh - var(--nav-height))' }}>
                    <JourneyMapper />
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default SubmitJourneyPage;
