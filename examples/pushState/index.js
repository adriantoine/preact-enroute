import {h, Component, render} from 'preact';
import {Router, Route} from '../../index';
import {Index, Pet, Pets, User, Users, NotFound} from '../generic';

const state = {
	location: window.location.pathname,
	users: [
		{id: 1, name: 'Bob'},
		{id: 2, name: 'Joe'},
	],
	pets: [
		{id: 1, userId: 1, name: 'Tobi', species: 'Ferret'},
		{id: 2, userId: 1, name: 'Loki', species: 'Ferret'},
		{id: 3, userId: 1, name: 'Jane', species: 'Ferret'},
		{id: 4, userId: 2, name: 'Manny', species: 'Cat'},
		{id: 5, userId: 2, name: 'Luna', species: 'Cat'},
	],
};

class App extends Component {
	constructor() {
		super();
		this.state = state;
	}

	componentDidMount() {
		window.addEventListener('popstate', () => {
			this.setState({location: window.location.pathname});
		});
	}

	getChildContext() {
		return {
			navigate: path => {
				history.pushState(null, '', path);
				this.setState({location: path});
			},
		};
	}

	render() {
		return (
			<Router {...this.state}>
				<Route path="/" component={Index}/>
				<Route path="/users" component={Users}/>
				<Route path="/users/:id" component={User}/>
				<Route path="/pets" component={Pets}/>
				<Route path="/pets/:id" component={Pet}/>
				<Route path="*" component={NotFound}/>
			</Router>
		);
	}
}

render(<App/>, document.body);
