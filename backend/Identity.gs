/**
 * Signing evidence: whenever someone signs an agreement (speaker agreements, the Charter, a withdrawal form,
 * the organizer's countersignature), the page asks for their location and takes a photo with the camera.
 * Both are saved privately in Drive ("Signing evidence") and printed on the signing record of the PDF.
 * If a device truly has no camera / no location, the person says so and that reason is recorded instead.
 */
const SIG_METHODS = ['draw', 'type', 'upload'];

function evidenceSave_(ev, label) {
  ev = ev || {};
  const out = { at: now_(), sig_method: SIG_METHODS.indexOf(ev.sig_method) >= 0 ? ev.sig_method : 'draw',
    camera: ev.camera === 'unavailable' ? 'unavailable' : 'ok', location: ev.location === 'unavailable' ? 'unavailable' : 'ok' };
  // camera photo
  if (out.camera === 'ok') {
    const m = String(ev.photo || '').match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('Please allow the camera so a photo can be taken while you sign.');
    if (m[2].length > 900000) throw new Error('The photo is too large. Please try again.');
    out.photo_id = recordsFolder_('Signing evidence').createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], label + '-' + out.at.replace(/[:T]/g, '') + '.' + (m[1] === 'png' ? 'png' : 'jpg'))).getId();
  } else {
    out.camera_note = String(ev.camera_note || 'No camera on this device').slice(0, 200);
  }
  // location
  if (out.location === 'ok') {
    const lat = Number(ev.lat), lng = Number(ev.lng);
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) || (lat === 0 && lng === 0)) throw new Error('Please allow location access so we can record where you signed.');
    out.lat = Math.round(lat * 1e5) / 1e5; out.lng = Math.round(lng * 1e5) / 1e5; out.accuracy = Math.round(Number(ev.accuracy) || 0);
    out.place = nearestPlace_(lat, lng);
  } else {
    out.location_note = String(ev.location_note || 'Location not available on this device').slice(0, 200);
  }
  out.ua = String(ev.ua || '').slice(0, 300);
  return out;
}

/** Nearest locality for a coordinate, via Apps Script's built-in Maps service. */
function nearestPlace_(lat, lng) {
  try {
    const r = Maps.newGeocoder().setLanguage('en').reverseGeocode(lat, lng);
    const res = (r && r.results) || [];
    if (!res.length) return '';
    const comps = res[0].address_components || [];
    const pick = function (t) { const c = comps.filter(function (x) { return (x.types || []).indexOf(t) >= 0; })[0]; return c ? c.long_name : ''; };
    const area = [pick('sublocality_level_1') || pick('neighborhood'), pick('locality') || pick('administrative_area_level_2'), pick('administrative_area_level_1'), pick('country')]
      .filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return area.join(', ') || res[0].formatted_address || '';
  } catch (e) { Logger.log('Reverse geocode failed: ' + e); return ''; }
}

/** Rows for a PDF signing record. */
function evidenceHtml_(ev, who) {
  if (!ev) return '';
  let photo = '';
  try { if (ev.photo_id) photo = '<img src="data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(ev.photo_id).getBlob().getBytes()) + '" style="height:90px;border-radius:6px">'; } catch (e) { photo = '(photo on file)'; }
  const where = ev.location === 'ok' ? esc_(ev.place || 'Location recorded') + ' (' + ev.lat + ', ' + ev.lng + (ev.accuracy ? ' · ±' + ev.accuracy + ' m' : '') + ')' : 'Not available: ' + esc_(ev.location_note || '');
  return '<tr><td>' + esc_(who || 'Signer') + ' · photo at signing</td><td>' + (ev.camera === 'ok' ? photo : 'Not available: ' + esc_(ev.camera_note || '')) + '</td></tr>' +
    '<tr><td>' + esc_(who || 'Signer') + ' · signed near</td><td>' + where + '</td></tr>' +
    '<tr><td>' + esc_(who || 'Signer') + ' · signature</td><td>' + ({ draw: 'Drawn on screen', type: 'Typed', upload: 'Uploaded image' }[ev.sig_method] || 'Drawn on screen') + ' · ' + esc_(String(ev.at).replace('T', ' ').slice(0, 16)) + ' IST</td></tr>';
}
