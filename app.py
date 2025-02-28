from flask import Flask, render_template, jsonify
import pandas as pd
from tqdm import tqdm
import requests

app = Flask(__name__)

# Function to fetch offer data without saving it to a file
def fetch_offers_data_for_current_month(offer_ids, token, link, filter_ids):
    results = []
    for offer_id in tqdm(offer_ids):
        url = link.format(id=offer_id)
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "content" in data and data['content']:
                    for item in data['content']:
                        assigned = int(item['assignedCoupons'])
                        used = int(item['giftConsumption'])
                        total = int(item['couponsCount'])

                        if assigned == 0:
                            remaining = total - used
                        elif assigned == 0 and used == 0:
                            remaining = assigned
                        else:
                            remaining = total - assigned

                        extracted_data = {
                            "ID": item['id'],
                            "Merchant": item['merchant']['nameEn'],
                            "Offer Name": item['nameEn'],
                            "Status": item['status'],
                            "Start Date": item['startDate'],
                            "End Date": item['endDate'],
                            "Coupons Count": total,
                            "Assigned Coupons": assigned,
                            "Used Coupons": used,
                            "Remaining": remaining
                        }
                        results.append(extracted_data)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for offer ID {offer_id}: {e}")

    if results:
        df = pd.DataFrame(results)
        df_filtered = df[df['ID'].isin(filter_ids)]
        df_sorted = df_filtered.sort_values(by="Remaining", ascending=True)
        return df_sorted.to_dict(orient='records')
    else:
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate_offers', methods=['POST'])
def generate_offers():
    token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcm9tb0BmYXdyeS5jb20iLCJhdWQiOlsiYmUtQk8iLCJ1c2VyLUJPIiwiZnAtQk8iLCJtYWNjLUJPIiwib3JkZXItQk8iLCJibyIsInN0b3JlLWJvIiwicHJvbW8tZW5naW5lLWJvIiwiZGVhbHMiLCJyZXBvcnQtQk8iLCJwYXlvdXQtQm8iLCJjb25maWciXSwicmxtIjoiQk8iLCJiZWkiOjAsInVzdCI6IkJVU0lORVNTX09QRVJBVElPTiIsImlzcyI6ImZhd3J5LmNvbSIsImV4cCI6MTczMzE4MDI2NywiaWF0IjoxNzI5NTgwMjY3LCJqdGkiOiI2ODZiOGQ2OC1iYWRkLTQ5NzktYTc1Yy03ZjlkZWRiOWU1ZTgifQ.ZymoXjofK65IoAjjHzdG_jg4wvD2vBZGjHPgQUoMcZ0'
    link = "https://myfawrypromo.fawrypayments.com:9016/deal-api/partners/offers/search?page=0&size=20&offerOwnerId={id}"

    # Offer IDs
    postTrxofferids = [190461,155452,91005,13952,33954,177452,96004,190502]
    postTrxOffers = [290758, 290757 , 293703 , 293710 , 293711 ,293712 ,290781, 290782 ,289754 ,289753,294708,295908]
    # Fetch Data
    offers = fetch_offers_data_for_current_month(postTrxofferids, token, link, postTrxOffers)

    if offers:
        return jsonify({'success': True, 'data': offers})
    else:
        return jsonify({'success': False, 'message': 'No data retrieved'})

if __name__ == "__main__":
    app.run(debug=True)
