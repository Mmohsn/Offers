// Globals
let voucherChart = null;
let offerData = [];
let currentFilter = 'all';

// Initialize the application
$(document).ready(function() {
    // Initialize existing functionality
    fetchData();
    
    // Set up filter button clicks
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        filterTable($(this).data('filter'));
        updateChart();
    });

    // Set up refresh button
    $('#refresh-btn').click(function() {
        $(this).addClass('rotating');
        fetchData();
        setTimeout(() => {
            $(this).removeClass('rotating');
        }, 1000);
    });
    
    // Enhanced search functionality
    const searchInput = $('#offer-search');
    
    // Add clear button functionality
    searchInput.on('input', function() {
        if ($(this).val().length > 0) {
            $('.search-input-group').addClass('has-value');
        } else {
            $('.search-input-group').removeClass('has-value');
        }
    });
    
    // Expanded search functionality to search across multiple fields
    $('#search-btn').click(function() {
        enhancedSearch();
    });
    
    // Allow pressing Enter to search
    searchInput.keypress(function(e) {
        if(e.which === 13) {
            enhancedSearch();
        }
    });
    
    // Add table row click functionality
    $(document).on('click', 'tr.clickable', function() {
        const offerId = $(this).data('id');
        const offer = offerData.find(o => o['ID'] === offerId);
        if (offer) {
            displayOfferDetails(offer);
        }
    });
    
    // New table filter functionality
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        const tableFilter = $(this).data('filter');
        filterTable(tableFilter);
    });
});

// Fetch data from the backend
function fetchData() {
    $.ajax({
        url: '/PostTransaction',
        type: 'POST',
        contentType: 'application/json',
        beforeSend: function() {
            $('#loading').show();
        },
        success: function(response) {
            if (response.success && response.data) {
                offerData = response.data;
                updateDashboard();
            } else {
                showNoData();
            }
        },
        error: function() {
            showNoData();
        },
        complete: function() {
            $('#loading').hide();
        }
    });
}

// Enhanced search across multiple fields
function enhancedSearch() {
    const searchValue = $('#offer-search').val().trim().toLowerCase();
    
    if (searchValue === '') {
        // If search is cleared, reset to show all data
        updateTable();
        return;
    }
    
    // Search across multiple fields
    const foundOffers = offerData.filter(offer => {
        // Check ID (exact match)
        if (offer['ID'] && offer['ID'].toString().toLowerCase() === searchValue) {
            return true;
        }
        
        // Check Merchant (contains)
        if (offer['Merchant'] && offer['Merchant'].toLowerCase().includes(searchValue)) {
            return true;
        }
        
        // Check Offer Name (contains)
        if (offer['Offer Name'] && offer['Offer Name'].toLowerCase().includes(searchValue)) {
            return true;
        }
        
        return false;
    });
    
    if (foundOffers.length > 0) {
        // If single match, show details and update summary
        if (foundOffers.length === 1) {
            displayOfferDetails(foundOffers[0]);
            updateSummaryForOffer(foundOffers[0]); // Add this line
            highlightOfferInChart(foundOffers[0]);
        }
        
        // Update table with search results
        updateTableWithFilteredData(foundOffers);
        
        // Add visual feedback
        $('#voucher-table').addClass('search-results');
        setTimeout(() => {
            $('#voucher-table').removeClass('search-results');
        }, 2000);
    } else {
        // Provide feedback when no matches are found
        showSearchNoResults(searchValue);
    }
}


// Original search for specific offer by ID (keep for backward compatibility)
function searchOffer() {
    const searchValue = $('#offer-search').val().trim();
    
    if (searchValue === '') {
        alert('Please enter an Offer ID');
        return;
    }
    
    const foundOffer = offerData.find(offer => {
        return offer['ID'] && offer['ID'].toString().toLowerCase() === searchValue.toLowerCase();
    });
    
    if (foundOffer) {
        displayOfferDetails(foundOffer);
        updateSummaryForOffer(foundOffer);
        highlightOfferInChart(foundOffer);
    } else {
        alert('No offer found with ID: ' + searchValue);
        $('#offer-details').hide();
    }
}

// Show visual feedback when no results found
function showSearchNoResults(searchValue) {
    // Create a nicer no-results message
    const noResultsMessage = `
        <tr class="no-results-row">
            <td colspan="9">
                <div class="no-data">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <p>No results found for "<span class="highlight">${searchValue}</span>"</p>
                    <button id="clear-search" class="filter-btn">Clear Search</button>
                </div>
            </td>
        </tr>
    `;
    
    $('#voucher-table-body').html(noResultsMessage);
    
    // Setup clear search button
    $('#clear-search').click(function() {
        $('#offer-search').val('');
        updateTable();
    });
}

// Update summary cards for a specific offer
function updateSummaryForOffer(offer) {
    // Animate summary cards to show they're being updated
    $('.summary-card').removeClass('fade-in');
    
    setTimeout(() => {
        $('#total-vouchers').text(offer['Coupons Count'].toLocaleString());
        $('#assigned-vouchers').text(offer['Assigned Coupons'].toLocaleString());
        $('#remaining-vouchers').text(offer['Remaining'].toLocaleString());
        
        // Update progress bars for single offer
        const assignedPercentage = (offer['Assigned Coupons'] / offer['Coupons Count']) * 100;
        const remainingPercentage = (offer['Remaining'] / offer['Coupons Count']) * 100;
        
        $('#assigned-progress').css('width', `${assignedPercentage}%`);
        $('#remaining-progress').css('width', `${remainingPercentage}%`);
        
        // Re-apply animation
        $('.summary-card').addClass('fade-in');
    }, 300);
}


// Highlight the selected offer in the chart
function highlightOfferInChart(offer) {
    if (!voucherChart) return;

    // Create a temporary array with just this offer for the chart
    const filteredData = [offer];

    // Find the index of the offer in the data array
    const offerIndex = offerData.findIndex(item => 
        item['ID'] === offer['ID']
    );

    if (offerIndex === -1) return;

    // Create a filtered dataset with just this offer
    const labels = [offer['Merchant']];

    let datasets = [];

    if (currentFilter === 'all' || currentFilter === 'assigned') {
        datasets.push({
            label: 'Assigned Vouchers',
            data: [offer['Assigned Coupons']],
            backgroundColor: 'rgba(76, 201, 240, 0.7)',
            borderColor: 'rgba(76, 201, 240, 1)',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(76, 201, 240, 0.9)',
        });
    }

    if (currentFilter === 'all' || currentFilter === 'remaining') {
        datasets.push({
            label: 'Remaining Vouchers',
            data: [offer['Remaining']],
            backgroundColor: 'rgba(247, 37, 133, 0.7)',
            borderColor: 'rgba(247, 37, 133, 1)',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(247, 37, 133, 0.9)',
        });
    }

    // Update the chart to show only the selected offer
    voucherChart.data.labels = labels;
    voucherChart.data.datasets = datasets;

    // Set a flag indicating we're in search mode
    voucherChart.searchMode = true;
    // Store the searched offer for tooltip access
    voucherChart.searchedOffer = offer;

    voucherChart.update();
}

// Reset the chart to show all offers
function resetChart() {
    updateChart();
}

// Display specific offer details
function displayOfferDetails(offer) {
    const detailsContainer = $('#offer-details');
    const detailsGrid = detailsContainer.find('.offer-detail-grid');
    
    detailsGrid.empty();
    
    // Add all offer properties to the details view
    for (const [key, value] of Object.entries(offer)) {
        const detailItem = `
            <div class="detail-item">
                <div class="detail-label">${key}</div>
                <div class="detail-value">${value.toLocaleString ? value.toLocaleString() : value}</div>
            </div>
        `;
        detailsGrid.append(detailItem);
    }
    
    // Add a "View All" button to reset
    detailsGrid.append(`
        <div class="detail-item">
            <button id="view-all-btn" class="search-btn">View All Offers</button>
        </div>
    `);
    
    // Set up the View All button with reset for search mode
    $('#view-all-btn').click(function() {
        // Reset search mode flag before updating dashboard
        if (voucherChart) {
            voucherChart.searchMode = false;
            voucherChart.searchedOffer = null;
        }
        updateDashboard();
        detailsContainer.hide();
    });
    
    detailsContainer.show();
    
    // Scroll to the details section
    $('html, body').animate({
        scrollTop: detailsContainer.offset().top - 20
    }, 500);
}

// Update the entire dashboard with new data
function updateDashboard() {
    updateSummary();
    updateChart();
    updateTable();
}

// Update summary cards with aggregated data
function updateSummary() {
    let totalVouchers = 0;
    let assignedVouchers = 0;
    let remainingVouchers = 0;

    offerData.forEach(offer => {
        totalVouchers += offer['Coupons Count'];
        assignedVouchers += offer['Assigned Coupons'];
        remainingVouchers += offer['Remaining'];
    });

    $('#total-vouchers').text(totalVouchers.toLocaleString());
    $('#assigned-vouchers').text(assignedVouchers.toLocaleString());
    $('#remaining-vouchers').text(remainingVouchers.toLocaleString());

    // Update progress bars
    const assignedPercentage = (assignedVouchers / totalVouchers) * 100;
    const remainingPercentage = (remainingVouchers / totalVouchers) * 100;
    
    $('#assigned-progress').css('width', `${assignedPercentage}%`);
    $('#remaining-progress').css('width', `${remainingPercentage}%`);
}

// Create or update the chart based on the current filter
function updateChart() {
    // Use merchant names as labels instead of offer names
    const labels = offerData.map(offer => offer['Merchant']);
    
    let datasets = [];
    
    if (currentFilter === 'all' || currentFilter === 'assigned') {
        datasets.push({
            label: 'Assigned Vouchers',
            data: offerData.map(offer => offer['Assigned Coupons']),
            backgroundColor: 'rgba(76, 201, 240, 0.7)',
            borderColor: 'rgba(76, 201, 240, 1)',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(76, 201, 240, 0.9)',
        });
    }
    
    if (currentFilter === 'all' || currentFilter === 'remaining') {
        datasets.push({
            label: 'Remaining Vouchers',
            data: offerData.map(offer => offer['Remaining']),
            backgroundColor: 'rgba(247, 37, 133, 0.7)',
            borderColor: 'rgba(247, 37, 133, 1)',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(247, 37, 133, 0.9)',
        });
    }

    if (voucherChart) {
        voucherChart.data.labels = labels;
        voucherChart.data.datasets = datasets;
        voucherChart.update();
    } else {
        createNewChart(labels, datasets);
    }
}

// Create a new chart instance
function createNewChart(labels, datasets) {
    const ctx = document.getElementById('voucherChart').getContext('2d');

    // Get screen width to adjust chart options for mobile
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth < 768;

    voucherChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Segoe UI', sans-serif",
                            size: isMobile ? 10 : 12
                        },
                        usePointStyle: true,
                        padding: isMobile ? 10 : 20,
                        boxWidth: isMobile ? 8 : 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#212529',
                    bodyColor: '#212529',
                    borderColor: '#e9ecef',
                    borderWidth: 1,
                    padding: isMobile ? 8 : 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        // Custom tooltip to show offer name and values
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            // Use searchedOffer if in search mode, otherwise use offerData
                            if (voucherChart.searchMode && voucherChart.searchedOffer) {
                                return voucherChart.searchedOffer['Offer Name'];
                            }
                            return offerData[index]['Offer Name'];
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
                        },
                        afterLabel: function(context) {
                            // Use searchedOffer if in search mode, otherwise use offerData
                            let offer;
                            if (voucherChart.searchMode && voucherChart.searchedOffer) {
                                offer = voucherChart.searchedOffer;
                            } else {
                                const index = context.dataIndex;
                                offer = offerData[index];
                            }
                            
                            return [
                                `Merchant: ${offer['Merchant']}`,
                                `Offer ID: ${offer['ID']}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            family: "'Segoe UI', sans-serif",
                            size: isMobile ? 8 : 10
                        },
                        autoSkip: false,
                        maxTicksLimit: isMobile ? 6 : 10
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f3f5'
                    },
                    ticks: {
                        font: {
                            family: "'Segoe UI', sans-serif",
                            size: isMobile ? 9 : 11
                        },
                        callback: function(value) {
                            // Abbreviate large numbers on mobile
                            if (isMobile && value >= 1000) {
                                return value >= 1000000
                                    ? (value / 1000000).toFixed(1) + 'M'
                                    : (value / 1000).toFixed(0) + 'K';
                            }
                            return value.toLocaleString();
                        }
                    }
                }
            },
            animation: {
                duration: isMobile ? 800 : 1500,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: isMobile ? 5 : 10
            },
            barPercentage: isMobile ? 0.8 : 0.7,
            categoryPercentage: isMobile ? 0.8 : 0.7
        }
    });

    // Initialize search mode flag
    voucherChart.searchMode = false;
    voucherChart.searchedOffer = null;
}

// Add a resize handler to adjust the chart when the window is resized
$(window).resize(function() {
    if (voucherChart) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;
        
        // Adjust chart font sizes for mobile
        voucherChart.options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
        voucherChart.options.plugins.legend.labels.padding = isMobile ? 10 : 20;
        voucherChart.options.scales.x.ticks.font.size = isMobile ? 8 : 10;
        voucherChart.options.scales.y.ticks.font.size = isMobile ? 9 : 11;
        voucherChart.options.scales.x.ticks.maxTicksLimit = isMobile ? 6 : 10;
        
        voucherChart.update();
    }
});

// Filter table data based on status
function filterTable(filterType) {
    if (filterType === 'all') {
        updateTable();
        return;
    }
    
    const filteredData = offerData.filter(offer => {
        if (filterType === 'active' && offer['Status'] === 'ACTIVE') {
            return true;
        }
        if (filterType === 'inactive' && offer['Status'] !== 'ACTIVE') {
            return true;
        }
        return false;
    });
    
    updateTableWithFilteredData(filteredData);
}

// Update table with filtered data
function updateTableWithFilteredData(filteredData) {
    const tableBody = $('#voucher-table-body');
    tableBody.empty();
    
    // Get screen width for responsive adjustments
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth < 640;
    
    if (filteredData.length === 0) {
        tableBody.html('<tr><td colspan="9"><div class="no-data">No matching data available.</div></td></tr>');
        return;
    }
    
    filteredData.forEach((offer, index) => {
        const status = offer['Status'];
        const statusClass = status === 'ACTIVE' ? 'status-active' : 'status-inactive';
        const isHighlighted = index % 2 === 0 ? 'highlight-row' : '';
        
        // Calculate percentages for progress bars
        const totalVouchers = offer['Coupons Count'] || 0;
        const assignedVouchers = offer['Assigned Coupons'] || 0;
        const usedVouchers = offer['Used Coupons'] || 0;
        const remainingVouchers = offer['Remaining'] || 0;
        
        const usagePercentage = totalVouchers > 0 ? (assignedVouchers / totalVouchers) * 100 : 0;
        const remainingPercentage = totalVouchers > 0 ? (remainingVouchers / totalVouchers) * 100 : 0;
        
        // Format dates for better display
        const startDate = offer['Start Date'] || '-';
        const endDate = offer['End Date'] || '-';
        
        let row = `<tr class="clickable ${isHighlighted} new-row" data-id="${offer['ID']}" style="animation-delay: ${index * 0.05}s">`;
        
        // Enhanced columns with better formatting
        row += `<td><span class="voucher-id">${offer['ID'] || '-'}</span></td>`;
        row += `<td>${offer['Merchant'] || '-'}</td>`;
        row += `<td><div class="offer-name">${offer['Offer Name'] || '-'}</div></td>`;
        row += `<td><span class="status-pill ${statusClass}">${status || '-'}</span></td>`;
        row += `<td>${startDate}</td>`;
        row += `<td>${endDate}</td>`;
        row += `<td><span class="voucher-count">${(totalVouchers).toLocaleString()}</span></td>`;
        row += `<td><span class="voucher-count">${(assignedVouchers).toLocaleString()}</span></td>`;
        row += `<td><span class="voucher-count">${(usedVouchers).toLocaleString()}</span></td>`;
        row += `<td><span class="voucher-count">${(remainingVouchers).toLocaleString()}</span></td>`;
        // Usage column with progress bar

        
        tableBody.append(row);
    });
    
    // Setup view details button functionality
    $('.view-details').click(function(e) {
        e.stopPropagation(); // Prevent row click from firing
        const offerId = $(this).data('id');
        const offer = offerData.find(o => o['ID'] === offerId);
        if (offer) {
            displayOfferDetails(offer);
        }
    });
}

// Override the original updateTable function
function updateTable() {
    updateTableWithFilteredData(offerData);
}

// Show "no data" message when data is unavailable
function showNoData() {
    $('#chart-container').html('<div class="no-data">No voucher data available. Please try again later.</div>');
    $('#table-container').html('<div class="no-data">No voucher data available.</div>');
}
