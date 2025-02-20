document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.getElementById('loading-bar');
    const tableContainer = document.getElementById('offers-table-container');

    // Ensure the loading bar and table are hidden on page load
    loadingBar.classList.remove('visible'); 
    tableContainer.classList.add('hidden'); 
    console.log('Page loaded: Loading bar and table are hidden');
});

document.getElementById('get-offers-btn').addEventListener('click', async () => {
    const loadingBar = document.getElementById('loading-bar');
    const tableContainer = document.getElementById('offers-table-container');
    const tableBody = document.getElementById('table-body');

    console.log('Button clicked: Showing loading bar');
    loadingBar.classList.add('visible'); // Show loading bar
    tableContainer.classList.add('hidden'); // Hide table while loading

    try {
        console.log('Fetching offers...');
        const response = await fetch('/generate_offers', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            console.log('Offers fetched successfully');
            tableBody.innerHTML = ''; // Clear previous data

            // Populate the table with fetched data
            result.data.forEach(offer => {
                const row = `
                    <tr>
                        <td>${offer.ID}</td>
                        <td>${offer.Merchant}</td>
                        <td>${offer["Offer Name"]}</td>
                        <td><span class="status ${offer.Status === 'ACTIVE' ? 'active' : 'inactive'}">${offer.Status}</span></td>
                        <td>${offer["Start Date"]}</td>
                        <td>${offer["End Date"]}</td>
                        <td>${offer["Coupons Count"]}</td>
                        <td>${offer["Assigned Coupons"]}</td>
                        <td>${offer["Used Coupons"]}</td>
                        <td>${offer.Remaining}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });

            // Show the table
            tableContainer.classList.remove('hidden');
        } else {
            console.error('Error fetching offers:', result.message);
            alert(result.message);
        }
    } catch (error) {
        console.error('Error occurred while fetching offers:', error);
        alert('An error occurred while fetching offers. Please try again.');
    } finally {
        // Hide loading bar regardless of success or failure
        console.log('Hiding loading bar');
        loadingBar.classList.remove('visible');
    }
});
