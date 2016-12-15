window.log = console.log;

var locationsElement = document.querySelector('#locations');
var locationsCsv = locationsElement.innerText.trim();
var coordinatePairs = locationsCsv.split('\n')
.map(line => line.split(','))
.map(([ id, lat, long ]) => ({ id, lat, long }))
log(coordinatePairs);

var el = redom.el;
var mount = redom.mount;

class Location {
	constructor() {
		this.el = el('.location');
	}

	update({ id, x, y }) {
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
	}
}

// Position of click event 'click' relative to element 'el'
function relativePos(el, click) {
	var rect = el.getBoundingClientRect();
	var x = click.clientX - rect.left;
	var y = click.clientY - rect.top;
	return { x, y };
}

class Locations {
	constructor() {
		this.list = redom.list('div', Location);
		this.el = el('div.locations', this.list,
			this.zoomIn = el('div.zoom.zoom-in'),
			this.zoomOut = el('div.zoom.zoom-out')
		);

		this.x = 128;
		this.y = 128;
		this.zoomLevel = 0;

		this.el.onclick = (ev) => {
			var click = relativePos(this.el, ev);

			var screenCoordinateMultiplier = Math.pow(0.5, this.zoomLevel);
			// Whoops, this should be so that the position that the user clicked
			// stays in place
			this.x = this.x + screenCoordinateMultiplier * (click.x - 128);
			this.y = this.y + screenCoordinateMultiplier * (click.y - 128);
			this.zoomLevel++;
			if (this.zoomLevel > 21)
				this.zoomLevel = 21;
			this.update(this.coordinatePairs);
		};

		this.zoomIn.onclick = (ev) => {
			this.zoomLevel++;
			if (this.zoomLevel > 21)
				this.zoomLevel = 21;
			ev.stopPropagation();
			this.render();
		};

		this.zoomOut.onclick = (ev) => {
			this.zoomLevel--;
			if (this.zoomLevel < 0)
				this.zoomLevel = 0;
			ev.stopPropagation();
			this.render();
		};
	}

	render() {
		this.update(this.coordinatePairs);
	}

	update(coordinatePairs) {
		log('Zoom level', this.zoomLevel);
		this.coordinatePairs = coordinatePairs;
		var processed = this.process(this.coordinatePairs, this.zoomLevel);
		this.list.update(processed);
	}

	process(coordinatePairs, zoomLevel) {
		return coordinatePairs.map(({ id, lat, long }) => {
			var zoom = Math.pow(2, zoomLevel);
			var lambda = long / 180 * Math.PI;
			var x = 128 / Math.PI * (lambda + Math.PI) - this.x;

			var phi = lat / 180 * Math.PI;
			var y = 128 / Math.PI * (Math.PI - Math.log(Math.tan(Math.PI / 4 + phi / 2))) - this.y;

			return { id, x: zoom * x, y: zoom * y };
		}).map(({ id, x, y }) => {
			return {
				id,
				x: x + 128,
				y: y + 128
			};
		});
	}

}

var locations = new Locations;
locations.update(coordinatePairs);
mount(document.body, locations);

