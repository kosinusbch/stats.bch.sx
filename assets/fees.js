preloads = "/assets/large_merchant.svg,/assets/medium_merchant.svg,/assets/small_merchant.svg,/assets/question.svg,/assets/btc.png,/assets/bch.png".split(",")
var tempImg = []
for(var x=0;x<preloads.length;x++) {
    tempImg[x] = new Image()
    tempImg[x].src = preloads[x]
}

function updateMerchant(type) {

    window.location.hash = '#'+type;

    var data = {
        "small": {
            "name":"Small Merchant",
            "description":"",
            "icon":"/assets/small_merchant.svg",
            "timeframe": "fastestFee",
            "txin": 253,
            "txout": 2,
            "product_price": 5,
            "feetype": "realtime"
        },
        "medium": {
            "name":"Medium Merchant",
            "description":"",
            "icon":"/assets/medium_merchant.svg",
            "timeframe": "fastestFee",
            "txin": 746,
            "txout": 2,
            "product_price": 7,
            "feetype": "realtime"
        },
        "large": {
            "name":"Large Merchant",
            "description":"",
            "icon":"/assets/large_merchant.svg",
            "timeframe": "fastestFee",
            "txin": 2741,
            "txout": 2,
            "product_price": 12,
            "feetype": "realtime"
        },
        "custom": {
            "name":"Custom",
            "description":"<p class=\"custom_menu\"><label for=\"product_price\">Product Price</label> <input id=\"product_price\" name=\"product_price\" type=\"number\" value=\"4\"> <label for=\"orders\">Orders</label> <input id=\"orders\" name=\"orders\" type=\"number\" value=\"300\"> <label for=\"feetype\">Fee Timeline</label> <select id=\"feetype\" name=\"feetype\"> <option value=\"realtime\">Realtime</option> <option value=\"ath\">All Time High (Price + Fees)</option> </select> <input type=\"submit\" onclick=\"loadCustomForm();\" value=\"Generate\"> </p>",
            "icon":"/assets/question.svg",
            "timeframe": "fastestFee",
            "txin": 300,
            "txout": 2,
            "product_price": 4,
            "feetype": "realtime"
        }
    }

    window.location.hash = '#'+type;
    var data = data[type];

    if(type == 'custom') {
        $("#merchant_name").replaceWith('<h2 id="merchant_name">'+data.name+'</h2>');
        $("#merchant_desc").replaceWith('<div id="merchant_desc">'+data.description+'</p>');
        $("#merchant_icon").replaceWith('<img id="merchant_icon" src="'+data.icon+'">');
    } else {
        getFees(data.timeframe, data.txin, data.txout, data.feetype, data.product_price);
        $("#merchant_name").replaceWith('<h2 id="merchant_name">'+data.name+'</h2>');
        $("#merchant_desc").replaceWith('<div id="merchant_desc"><p><b>$'+(data.product_price * data.txin).toFixed(2)+'</b> in monthly sales, divided by <b>'+data.txin+'</b> orders at <b>$'+data.product_price.toFixed(2)+'</b> each. '+data.description+'</p></div>');
        $("#merchant_icon").replaceWith('<img id="merchant_icon" src="'+data.icon+'">');
    }



}

function getFees(timeframe, txin, txout, feetype, product_price) {
    var bytesPerIn = 148;
    var bytesPerOut = 44;
    var txbytes = (txin * bytesPerIn + txout * bytesPerOut + 10);

    $( ".fee_box" ).addClass('loading');

    var btc_fee = fetch('https://bitcoinfees.earn.com/api/v1/fees/recommended').then(function(response){ return response.json(); });

    var btc_price = fetch('https://api.coincap.io/v2/rates/bitcoin').then(function(response){ return response.json(); });

    var bch_price = fetch('https://api.coincap.io/v2/rates/bitcoin-cash').then(function(response){ return response.json(); });

    Promise.all([btc_fee,btc_price,bch_price]).then(function(results){
        results["btc_fee"] = results[0];
        results["btc_price"] = results[1].data.rateUsd;
        results["bch_price"] = results[2].data.rateUsd;
        console.log(results);
        
        if(feetype == 'ath') {
            results["btc_price"] = 20089; // source: www.abitgreedy.com/all-time-high-price/
            results["bch_price"] = 4355; // source: www.abitgreedy.com/all-time-high-price/
            btc_satbyte = 1300; // Approx. conservative estimate, source: jochen-hoenicke.de/queue/#0,all
            bch_satbyte = 1.1; // During the BCH stress test this would be required for 1-block confirmation
        } else {
            btc_satbyte = results.btc_fee[timeframe];
            bch_satbyte = 1; // Todo: get mempool size, sort by fees, get actual next-block fee. Historically always 1sat/b.
        }

        total_usd = txin * product_price;

        btc_usd = ((btc_satbyte * txbytes) / 100000000) * results.btc_price;
        btc_usd_ratio = ((btc_usd / product_price) / txin) * 100;
        bch_usd = ((bch_satbyte * txbytes) / 100000000) * results.bch_price;
        bch_usd_ratio = ((bch_usd / product_price) / txin) * 100;

        $(".btc_fees").replaceWith('<div class="fee_box btc_fees"><h1><img src="/assets/btc.png">BTC</h1><p>'+btc_satbyte+' sat/b</p><p>'+btc_usd_ratio.toFixed(2)+'% of holdings</p><p>'+((btc_satbyte * txbytes) / 100000000).toFixed(8)+' BTC ~ $'+btc_usd.toFixed(2)+' in fees</p><p class="left_with">$'+(total_usd - btc_usd).toFixed(2)+' after fees</p></div>');
        $(".bch_fees").replaceWith('<div class="fee_box bch_fees"><h1><img src="/assets/bch.png">BCH</h1><p>'+bch_satbyte+' sat/b</p><p>'+bch_usd_ratio.toFixed(4)+'% of holdings</p><p>'+((bch_satbyte * txbytes) / 100000000).toFixed(8)+' BCH ~ $'+bch_usd.toFixed(4)+' in fees</p><p class="left_with">$'+(total_usd - bch_usd).toFixed(2)+' after fees</p></div>');
    
        getFeesPayPal(txin, product_price);
        getFeesStripe(txin, product_price);

        $( ".fee_box" ).removeClass('loading');

    });

}

function getFeesPayPal(txin, product_price) {
    var amount = product_price;
    var amount = (amount - 0.30);
    console.log(amount);
    var amount = (amount / 1.044);
    console.log(amount);
    
    var fee_per = (product_price - amount);
    var fee_total = fee_per * txin;

    var fee_precentage = ((fee_total / (product_price * txin)) * 100).toFixed(2);

    $(".paypal_fees").replaceWith('<div class="fee_box paypal_fees"><h1>PayPal</h1><p>$0.30 + 4.4%</p><p>'+fee_precentage+'% of holdings</p><p>$'+fee_total.toFixed(2)+' in fees</p><p class="left_with">$'+((product_price * txin) - fee_total).toFixed(2)+' after fees</p></div>');
    $(".stripe_fees").replaceWith('<div class="fee_box stripe_fees"><h1>Stripe</h1><p>$0.30 + 2.9%</p></div>');
}

function getFeesStripe(txin, product_price) {
    var amount = product_price;
    var amount = (amount - 0.30);
    console.log(amount);
    var amount = (amount / 1.029);
    console.log(amount);
    
    var fee_per = (product_price - amount);
    var fee_total = fee_per * txin;

    var fee_precentage = ((fee_total / (product_price * txin)) * 100).toFixed(2);

    $(".stripe_fees").replaceWith('<div class="fee_box stripe_fees"><h1>Stripe</h1><p>$0.30 + 2.9%</p><p>'+fee_precentage+'% of holdings</p><p>$'+fee_total.toFixed(2)+' in fees</p><p class="left_with">$'+((product_price * txin) - fee_total).toFixed(2)+' after fees</p></div>');
}

function loadCustomForm() {
    var product_price = $('#product_price').val();
    var txin = $('#orders').val();
    var feetype = $('#feetype').val();
    getFees('fastestFee', txin, 2, feetype, product_price);
    window.location.hash = '#custom-'+product_price+'-'+txin+'-'+feetype;

}

function loadCustom(product_price,txin,feetype) {
    getFees('fastestFee', txin, 2, feetype, product_price);
    $('#feetype').val(feetype);
    $('#product_price').val(product_price);
    $('#orders').val(txin);
}
