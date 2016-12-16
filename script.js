window.log = console.log;

var locationsElement = document.querySelector('#locations');
var locationsCsv = locationsElement.innerText.trim();
var coordinatePairs = locationsCsv.split('\n')
.map(line => line.split(','))
.map(([ id, lat, long ]) => ({ id, lat, long }));

coordinatePairs = coordinatePairs.slice(0, 300);

log(coordinatePairs);

var el = redom.el;
var mount = redom.mount;

class Marker {
	constructor() {
		this.el = el('.marker');
		log('New marker');
	}

	update({ id, x, y }) {
		log('Marker update');
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

class Map {
	get zoomLevel() {
		return this._zoomLevel;
	}

	set zoomLevel(value) {
		this._zoomLevel = Math.max(0, Math.min(21, value));
	}

	constructor() {
		this.el = el('.map',
			this.markers = el('.markers'),
			this.list = redom.list(this.markers, Marker, 'id'),
			this.zoomIn = el('.zoom.zoom-in'),
			this.zoomOut = el('.zoom.zoom-out'),
			this.debug = el('.debug',
				this.debugX = el('.x'),
				this.debugY = el('.y'),
				this.debugZoomLevel = el('.zoomLevel'))
		);

		this.x = 128;
		this.y = 128;
		this.zoomLevel = 0;

		this.el.onclick = (ev) => {
			var click = relativePos(this.el, ev);

			var screenCoordinateMultiplier = Math.pow(0.5, this.zoomLevel);

			// This brings (x, y) to the position that was clicked
			this.x = this.x + screenCoordinateMultiplier * (click.x - 128);
			this.y = this.y + screenCoordinateMultiplier * (click.y - 128);

			this.zoomLevel++;

			// But we want to adjust it so that the clicked position stays in place
			// So do a back-adjustment with the new screenCoordinateMultiplier
			screenCoordinateMultiplier = Math.pow(0.5, this.zoomLevel);
			this.x = this.x - screenCoordinateMultiplier * (click.x - 128);
			this.y = this.y - screenCoordinateMultiplier * (click.y - 128);

			this.update(this.coordinatePairs);
		};

		this.zoomIn.onclick = (ev) => {
			this.zoomLevel++;
			ev.stopPropagation();
			this.render();
		};

		this.zoomOut.onclick = (ev) => {
			this.zoomLevel--;
			ev.stopPropagation();
			this.render();
		};

	}

	render() {
		this.update(this.coordinatePairs);
	}

	update(coordinatePairs) {
		this.coordinatePairs = coordinatePairs;
		var processed = this.process(this.coordinatePairs, this.zoomLevel);
		this.list.update(processed);

		this.debugZoomLevel.textContent = 'zoom ' + this._zoomLevel;
		this.debugX.textContent = 'x ' + this.x;
		this.debugY.textContent = 'y ' + this.y;
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

var locations = new Map;
locations.update(coordinatePairs);
mount(document.body, locations);

