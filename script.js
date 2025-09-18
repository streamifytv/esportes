        // Global variables
        let allChannels = [];
        let scheduleData = null;
        let currentCategory = null;
        let player;

        // Animate the logo
        function animateLogo() {
            let gdpElement = document.getElementById('gdp');
            if (!gdpElement) return;

            let chars = [...gdpElement.textContent];
            gdpElement.innerHTML = chars.map(c => `<span>${c}</span>`).join('');

            let spans = document.querySelectorAll('#gdp span');
            let i = 0;
            setInterval(() => {
                spans.forEach((s, idx) => s.style.color = idx === i ? 'white' : '#039be5');
                i = (i + 1) % spans.length;
            }, 100);
        }

        // Fetch schedule data
        async function fetchSchedule() {
            const url = 'https://cors.eu.org/https://tv247.us/schedule.json';
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } catch (err) {
                console.error('Error fetching schedule:', err);
                throw err;
            }
        }

        // Extract all channels from the JSON data
        function extractChannelsFromData(data) {
            const channels = [];
            const today = Object.keys(data)[0];
            const categories = Object.keys(data[today]);
            
            categories.forEach(category => {
                const events = data[today][category];
                
                events.forEach(event => {
                    if (event.channels && event.channels.length > 0) {
                        event.channels.forEach(channel => {
                            channels.push({
                                name: channel.channel_name,
                                category: category,
                                url: `https://wasitv-pro.site/gdp/${channel.channel_id}/index.m3u8`,
                                eventName: event.event,
                                eventTime: event.time
                            });
                        });
                    }
                });
            });
            
            return channels;
        }

        function createCategoryButtons(data) {
            const categoriesContainer = document.getElementById('categoriesContainer');
            const today = Object.keys(data)[0];
            const categories = Object.keys(data[today]);
            
            // Create buttons for each category
            categories.forEach((category, index) => {
                const button = document.createElement('button');
                button.className = `category-btn ${index === 0 ? 'active first-category' : ''}`;
                button.dataset.category = category;
                button.textContent = category;
                categoriesContainer.appendChild(button);
            });
            
            // Set the first category as active by default
            if (categories.length > 0) {
                currentCategory = categories[0];
            }
        }

        // Render channels based on current category and search
        function renderChannelGrid() {
            const channelGrid = document.getElementById('channelGrid');
            channelGrid.innerHTML = '';

            const keyword = document.getElementById('search').value.toLowerCase().trim();
            
            // Filter channels by current category and search keyword
            const filteredChannels = allChannels.filter(channel => 
                (channel.name.toLowerCase().includes(keyword) || 
                 channel.category.toLowerCase().includes(keyword) ||
                 (channel.eventName && channel.eventName.toLowerCase().includes(keyword))) &&
                (currentCategory ? channel.category === currentCategory : true)
            );

            if (filteredChannels.length === 0) {
                document.getElementById('noResults').classList.remove('d-none');
            } else {
                document.getElementById('noResults').classList.add('d-none');
            }

            filteredChannels.forEach(channel => {
                const col = document.createElement('div');
                col.className = 'col-6 col-md-3 col-lg-2';
                
                col.innerHTML = `
                    <div class="channel-card">
                        <a href="#" data-url="${channel.url}" data-name="${channel.name}" class="channel-btn open-channel">
                            <span>${channel.name}</span>
                        </a>
                        <div class="mt-2 text-center">
                            <div class="event-time">${channel.eventTime || ''}</div>
                            <div class="event-name">${channel.eventName || ''}</div>
                            <div class="small text-yellow">${channel.category}</div>
                        </div>
                    </div>`;
                
                channelGrid.appendChild(col);
            });

            // Add event listeners to channel buttons
            document.querySelectorAll('.open-channel').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openChannelViewer(this.dataset.url, this.dataset.name);
                });
            });

            updateResultCount(filteredChannels.length);
        }

        // Update result count
        function updateResultCount(count) {
            const resultElement = document.getElementById('resultCount');
            
            resultElement.textContent = count === 1 ? 
                `Showing ${count} channel in ${currentCategory}` : 
                `Showing ${count} channels in ${currentCategory}`;
        }

        // Open viewer
        function openChannelViewer(url, name) {
            document.getElementById('viewerTitle').textContent = name;
            document.getElementById('videoViewer').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            const playerElement = document.getElementById('channelPlayer');
            playerElement.src = url;

            if (!player) {
                player = new Plyr('#channelPlayer', {
                	autoplay:true,
                muted:true,
                    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
                });
            } else {
                player.source = {
                    type: 'video',
                    sources: [{
                        src: url,
                        type: 'video/mp4' // This may need to be adjusted based on the stream type
                    }]
                };

            }
        }

        // Close viewer
        function closeViewer() {
            if (player) {
                player.stop();
                player.destroy();
                player = null;
            }
            document.getElementById('videoViewer').style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // DOM Ready
        document.addEventListener('DOMContentLoaded', function() {
            animateLogo();

            fetchSchedule()
                .then(data => {
                    scheduleData = data;
                    allChannels = extractChannelsFromData(data);
                    createCategoryButtons(data);
                    renderChannelGrid();
                    document.getElementById('loadingSpinner').classList.add('d-none');
                    
                    // Add event listeners to category buttons
                    document.getElementById('categoriesContainer').addEventListener('click', function(e) {
                        if (e.target.classList.contains('category-btn')) {
                            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                            e.target.classList.add('active');
                            currentCategory = e.target.dataset.category;
                            renderChannelGrid();
                        }
                    });
                })
                .catch(err => {
                    console.error('Failed to load schedule data:', err);
                    document.getElementById('loadingSpinner').innerHTML = `
                        <div class="alert alert-danger" role="alert">
                            Failed to load channels. Please try again later.
                        </div>
                    `;
                });
            
            // Add event listener for search input
            document.getElementById('search').addEventListener('input', renderChannelGrid);
            
            // Add event listener for close viewer button
            document.getElementById('closeViewer').addEventListener('click', closeViewer);
            
            // Add escape key to close viewer
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && document.getElementById('videoViewer').style.display === 'flex') {
                    closeViewer();
                }
            });
        });