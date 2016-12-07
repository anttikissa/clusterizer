window.log = console.log;

var locationsElement = document.querySelector('#locations');
var locationsCsv = locationsElement.innerText.trim();
var locations = locationsCsv.split('\n')
	.map(line => line.split(','))
	.map(([ id, lat, long ]) => ({ id, lat, long }))
log(locations);

var el = redom.el;
var list = redom.list;
var mount = redom.mount;

class Location {
	constructor() {
		this.el = el('.location');
	}

	update({ id, lat, long }) {
		this.el.innerText = id + ' ' + lat + ',' + long;
	}
}

var locs = redom.list('div', Location);
locs.update(locations);
mount(document.body, locs);

