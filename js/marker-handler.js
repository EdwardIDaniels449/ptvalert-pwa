/**
 * Marker Handler Script
 * Handles creation and management of map markers
 */

(function() {
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Marker Handler] Initializing marker handler');
        
        // Register with map ready callbacks
        if (!window.mapReadyCallbacks) {
            window.mapReadyCallbacks = [];
        }
        
        window.mapReadyCallbacks.push(initializeMarkerHandler);
    });
    
    // Initialize marker handler when map is ready
    function initializeMarkerHandler() {
        console.log('[Marker Handler] Map is ready, initializing marker handler');
        
        // Initialize markers array if not exists
        window.markers = window.markers || [];
        
        // Add marker creation function to window
        window.addReportMarker = addReportMarker;
        
        // Load existing markers
        loadExistingMarkers();
    }
    
    // Add a report marker to the map
    function addReportMarker(location, description, reportId, image) {
        console.log('[Marker Handler] Adding report marker:', location, description);
        
        if (!window.map) {
            console.error('[Marker Handler] Map not initialized');
            return null;
        }
        
        // Create report data object
        const reportData = {
            id: reportId || 'marker-' + Date.now(),
            location: location,
            description: description,
            time: new Date().toISOString(),
            image: image || '',
            emoji: '🐶' // Default emoji
        };
        
        try {
            // Create marker
            const marker = new google.maps.Marker({
                position: location,
                map: window.map,
                animation: google.maps.Animation.DROP,
                title: description,
                label: {
                    text: '🐶',
                    fontSize: '24px',
                    className: 'marker-label'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0,
                },
                optimized: false
            });
            
            // Add click event listener
            marker.addListener('click', function() {
                console.log('[Marker Handler] Marker clicked:', reportData.id);
                
                // Call showReportDetails function if available
                if (typeof window.showReportDetails === 'function') {
                    window.showReportDetails(reportData);
                } else {
                    // 关闭任何已打开的信息窗口
                    if (window.openedInfoWindow) {
                        window.openedInfoWindow.close();
                    }
                    
                    // 直接在地图上显示信息窗口
                    const infoWindow = new google.maps.InfoWindow({
                        content: createInfoWindowContent(description),
                        maxWidth: 300
                    });
                    
                    infoWindow.open(window.map, marker);
                    
                    // 保存当前打开的信息窗口引用
                    window.openedInfoWindow = infoWindow;
                }
            });
            
            // Store report data with marker
            marker.reportData = reportData;
            
            // Add to markers array
            window.markers.push(marker);
            
            // Save markers to storage
            saveMarkersToStorage();
            
            return marker;
        } catch (error) {
            console.error('[Marker Handler] Error adding marker:', error);
            return null;
        }
    }
    
    // Create info window content
    function createInfoWindowContent(description) {
        let content = '<div style="padding: 10px; max-width: 300px;">';
        
        // Add description
        content += `<div style="font-size: 14px; margin-bottom: 10px;">${description}</div>`;
        
        // Add timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        const dateStr = now.toLocaleDateString();
        content += `<div style="font-size: 12px; color: #666; margin-top: 5px;">${dateStr} ${timeStr}</div>`;
        
        content += '</div>';
        
        return content;
    }
    
    // Load existing markers from storage
    function loadExistingMarkers() {
        console.log('[Marker Handler] Loading existing markers');
        
        try {
            // Try to load from localStorage
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (savedMarkers) {
                const markerData = JSON.parse(savedMarkers);
                
                markerData.forEach(function(data) {
                    // Add marker to map
                    addReportMarker(
                        {lat: data.lat, lng: data.lng},
                        data.description,
                        data.id,
                        data.image
                    );
                });
                
                console.log('[Marker Handler] Loaded', markerData.length, 'markers from storage');
            } else {
                console.log('[Marker Handler] No saved markers found in storage');
            }
        } catch (error) {
            console.error('[Marker Handler] Error loading markers from storage:', error);
        }
    }
    
    // Save markers to storage
    function saveMarkersToStorage() {
        if (!window.markers) {
            return;
        }
        
        try {
            // Convert markers to simple objects for storage
            const markerData = window.markers.map(function(marker) {
                const position = marker.getPosition();
                const reportData = marker.reportData || {};
                
                return {
                    lat: position.lat(),
                    lng: position.lng(),
                    description: reportData.description || marker.getTitle() || '',
                    id: reportData.id || ('marker-' + Date.now()),
                    time: reportData.time || new Date().toISOString(),
                    image: reportData.image || ''
                };
            });
            
            // Save to localStorage
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            console.log('[Marker Handler] Saved', markerData.length, 'markers to storage');
        } catch (error) {
            console.error('[Marker Handler] Error saving markers to storage:', error);
        }
    }
    
    // Expose functions to global scope
    window.MarkerHandler = {
        addReportMarker: addReportMarker,
        loadExistingMarkers: loadExistingMarkers,
        saveMarkersToStorage: saveMarkersToStorage
    };
})(); 