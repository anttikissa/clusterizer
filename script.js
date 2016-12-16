window.log = console.log;

var locationsElement = document.querySelector('#locations');
var locationsCsv = locationsElement.innerText.trim();
var coordinatePairs = locationsCsv.split('\n')
.map(line => line.split(','))
.map(([ id, lat, long ]) => ({ id, lat, long }));

// Just a small selection, for now
coordinatePairs = coordinatePairs.slice(0, 200);

const { el, list, mount } = redom;

class Marker {
	constructor() {
		this.el = el('.marker');
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
			this.list = list(this.markers, Marker, 'id'),
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
		this.dragStartPos = null;

		// Drag handling
		this.markers.onmousedown = (ev) => {
			this.dragStartPos = relativePos(this.el, ev);

			const mouseup = (ev) => {
				var finalPos = relativePos(this.el, ev);
				if (typeof this.dragStartPos !== 'object')
					return;

				var diff = {
					x: finalPos.x - this.dragStartPos.x,
					y: finalPos.y - this.dragStartPos.y
				};

				if (Math.abs(diff.x) + Math.abs(diff.y) < 3) {
					this.dragStartPos = null;
					return;
				}

				window.removeEventListener('mouseup', mouseup);
				window.removeEventListener('mousemove', mousemove);

				var screenCoordinateMultiplier = Math.pow(0.5, this.zoomLevel);
				this.markers.classList.add('disable-transition');
				this.markers.style.left = this.markers.style.top = 0;
				this.x = this.x - screenCoordinateMultiplier * diff.x;
				this.y = this.y - screenCoordinateMultiplier * diff.y;
				this.render();

				// A hacky way to disable mousemove handler after drag has ended
				this.dragStartPos = 'ended';
				// Prevent click event from happening
				setTimeout(() => {
					this.markers.classList.remove('disable-transition');
					this.dragStartPos = null;
				});
			};

			const mousemove = (ev) => {
				if (this.dragStartPos && typeof this.dragStartPos === 'object') {
					var newPos = relativePos(this.el, ev);
					this.markers.style.left = (newPos.x - this.dragStartPos.x) + 'px';
					this.markers.style.top = (newPos.y - this.dragStartPos.y) + 'px';
				}
			};

			window.addEventListener('mouseup', mouseup);
			window.addEventListener('mousemove', mousemove);
		};

		// Click to zoom
		this.el.onclick = (ev) => {
			if (this.dragStartPos)
				return;

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

			this.render();
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
		this.debugX.textContent = 'x ' + this.x.toFixed(6);
		this.debugY.textContent = 'y ' + this.y.toFixed(6);
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

