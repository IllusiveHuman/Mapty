'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();

    id = (Date.now() + '').slice(-10)

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat,lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence;

        this._calcPace()
        this._setDescription()
    }

    _calcPace() {
        // min/km
        this.pace = this.duration / this.distance
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain;

        this._calcSpeed()
        this._setDescription()
    }

    _calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60)

        return this.speed
    }
}


// const run1 = new Running([50, -12], 5.2, 2, 178)
// const cycl1 = new Cycling([50, -16], 27, 95, 538)

// console.log(run1, cycl1)

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition()
        this._getLocalStorage()
        form.addEventListener('submit', this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert("Could not get you position")
            });
        }
    }

    _loadMap(position) {
        const { latitude } = position.coords
        const { longitude } = position.coords

        const coords = [latitude, longitude]

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.#map);
        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work)
        })
    }


    _showForm(mapEvent_) {
        this.#mapEvent = mapEvent_;
        form.classList.remove('hidden')
        inputDistance.focus();
    }

    _hideForm() {
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = 'none'
        form.classList.add('hidden')

        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(event) {
        // 
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))


        const allPositive = (...inputs) => inputs.every(inp => inp > 0)

        event.preventDefault()

        // Get data from form

        const type = inputType.value;
        const distance = +inputDistance.value
        const duration = +inputDuration.value
        const { lat, lng } = this.#mapEvent.latlng
        let workout;
        if (type === 'running') {
            const cadence = +inputCadence.value
            // console.log(distance, duration, cadence)
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have to be positive value')
            }
            workout = new Running([lat, lng], distance, duration, cadence)
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have to be positive value')
            }
            workout = new Cycling([lat, lng], distance, duration, elevation)
        }

        this.#workouts.push(workout)
        // Display marker
        this._renderWorkoutMarker(workout)

        // Render workout on list
        this._renderWorkout(workout)

        // Hide form + clear input fields
        this._hideForm();

        // Sel local storage to all workouts
        this._setLocalStorage()
    }

    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`).openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                    <h2 class="workout__title">${workout.description}</h2>
                    <div class="workout__details">
                        <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                        <span class="workout__value">${workout.distance}</span>
                        <span class="workout__unit">km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⏱</span>
                        <span class="workout__value">${workout.duration}</span>
                        <span class="workout__unit">min</span>
                    </div>`;
        if (workout.type === 'running') {
            html += `          
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }
        if (workout.type === 'cycling') {
            html += `          
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }

        form.insertAdjacentHTML('afterend', html)
    }

    _moveToPopup(eventClick) {
        let eventClick_ = eventClick.target.closest('.workout')
        if (!eventClick_) { return }

        const obj = this.#workouts.find((el) => el.id === eventClick_.dataset.id)
        // console.log(obj)

        this.#map.setView(obj.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        })
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'))

        if (!data) { return; }
        this.#workouts = data
        this.#workouts.forEach(workout => {
            this._renderWorkout(workout)
        })
    }

    reset() {
        localStorage.removeItem('workouts')
        location.reload()
    }
}

const app = new App();
