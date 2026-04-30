import InteractiveTimeline from '../Interactive/InteractiveTimeline';

export default function DecisionNode({
    onNodeSelect,
    onNodeVideoRequest,
    onPathChange,
    onActiveNodePosition,
    onRecenterStart,
    onRecenterComplete,
    onBack,
    searchQuery,
    activeFilters,
    searchMatches = [],
    isAdmin = false,
    initialZoomStack = [],
    initialActivePath = [],
    forceMobile,
    framed = false,
    adminDragEnabled = false,
    onAdminNodeLayoutUpdate,
    onAdminNodeLayoutCommit,
    onAdminLayoutConfigUpdate,
    focusMode = false,
    mirrorPathNodeIds = [],
}) {
    return (
        <InteractiveTimeline
            onNodeSelect={onNodeSelect}
            onNodeVideoRequest={onNodeVideoRequest}
            onPathChange={onPathChange}
            onActiveNodePosition={onActiveNodePosition}
            onRecenterStart={onRecenterStart}
            onRecenterComplete={onRecenterComplete}
            onBack={onBack}
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            searchMatches={searchMatches}
            isAdmin={isAdmin}
            initialZoomStack={initialZoomStack}
            initialActivePath={initialActivePath}
            forceMobile={forceMobile}
            framed={framed}
            adminDragEnabled={adminDragEnabled}
            onAdminNodeLayoutUpdate={onAdminNodeLayoutUpdate}
            onAdminNodeLayoutCommit={onAdminNodeLayoutCommit}
            onAdminLayoutConfigUpdate={onAdminLayoutConfigUpdate}
            focusMode={focusMode}
            mirrorPathNodeIds={mirrorPathNodeIds}
        />
    );
}
