/**
 * External dependencies
 */
import React, { Component } from 'react';
import { getLocaleSlug, localize } from 'i18n-calypso';
import { connect } from 'react-redux';
import page from 'page';
import { get, includes, isEmpty } from 'lodash';
import moment from 'moment';
import { Button, Card, CompactCard, ProgressBar } from '@automattic/components';
/**
 * Internal dependencies
 */
import CardHeading from 'components/card-heading';
import DocumentHead from 'components/data/document-head';
import FormattedHeader from 'components/formatted-header';
import Gridicon from 'components/gridicon';
import HeaderCake from 'components/header-cake';
import Main from 'components/main';
import MigrateButton from './migrate-button';
import SidebarNavigation from 'my-sites/sidebar-navigation';
import Site from 'blocks/site';
import SiteSelector from 'components/site-selector';
import Spinner from 'components/spinner';
import { EVERY_TEN_SECONDS, Interval } from 'lib/interval';
import { getSite, getSiteAdminUrl, isJetpackSite } from 'state/sites/selectors';
import { updateSiteMigrationStatus } from 'state/sites/actions';
import { getSelectedSite, getSelectedSiteId, getSelectedSiteSlug } from 'state/ui/selectors';
import isSiteAutomatedTransfer from 'state/selectors/is-site-automated-transfer';
import wpLib from 'lib/wp';

import ImportTypeChoice from './components/import-type-choice';
/**
 * Style dependencies
 */
import './section-migrate.scss';
import { redirectTo } from 'my-sites/migrate/helpers';

const wpcom = wpLib.undocumented();

class SectionMigrate extends Component {
	state = {
		migrationStatus: 'unknown',
		percent: 0,
		startTime: '',
		errorMessage: '',
		chosenImportType: '',
	};

	componentDidMount() {
		this.updateFromAPI();
	}

	componentDidUpdate( prevProps ) {
		if ( this.props.targetSiteId !== prevProps.targetSiteId ) {
			this.updateFromAPI();
		}
	}

	getImportHref = () => {
		const { isTargetSiteJetpack, targetSiteImportAdminUrl, targetSiteSlug } = this.props;

		return isTargetSiteJetpack ? targetSiteImportAdminUrl : `/import/${ targetSiteSlug }`;
	};

	jetpackSiteFilter = sourceSite => {
		const { targetSiteId } = this.props;

		return sourceSite.jetpack && sourceSite.ID !== targetSiteId;
	};

	resetMigration = () => {
		const { targetSiteId, targetSiteSlug } = this.props;

		wpcom.resetMigration( targetSiteId ).finally( () => {
			page( `/migrate/${ targetSiteSlug }` );
			/**
			 * Note this migrationStatus is local, thus the setState vs setMigrationState.
			 * Call to updateFromAPI will update both local and non-local state.
			 */
			this.setState( { migrationStatus: 'inactive', errorMessage: '' }, this.updateFromAPI );
		} );
	};

	setMigrationState = state => {
		if ( state.migrationStatus ) {
			this.props.updateSiteMigrationStatus( this.props.targetSiteId, state.migrationStatus );
		}
		this.setState( state );
	};

	setSourceSiteId = sourceSiteId => {
		this.props.navigateToSelectedSourceSite( sourceSiteId );
	};

	startMigration = () => {
		const { sourceSiteId, targetSiteId } = this.props;

		if ( ! sourceSiteId || ! targetSiteId ) {
			return;
		}

		this.setMigrationState( { migrationStatus: 'backing-up' } );

		wpcom
			.startMigration( sourceSiteId, targetSiteId )
			.then( () => this.updateFromAPI() )
			.catch( error => {
				const { message = '' } = error;
				this.setMigrationState( { migrationStatus: 'error', errorMessage: message } );
			} );
	};

	updateFromAPI = () => {
		const { targetSiteId } = this.props;
		wpcom
			.getMigrationStatus( targetSiteId )
			.then( response => {
				const {
					status: migrationStatus,
					percent,
					source_blog_id: sourceSiteId,
					created: startTime,
				} = response;

				if ( sourceSiteId && sourceSiteId !== this.props.sourceSiteId ) {
					this.setSourceSiteId( sourceSiteId );
				}

				if ( migrationStatus ) {
					if ( startTime && isEmpty( this.state.startTime ) ) {
						const startMoment = moment.utc( startTime, 'YYYY-MM-DD HH:mm:ss' );

						if ( ! startMoment.isValid() ) {
							this.setMigrationState( {
								migrationStatus,
								percent,
							} );
							return;
						}

						const localizedStartTime = startMoment
							.local()
							.locale( getLocaleSlug() )
							.format( 'lll' );

						this.setMigrationState( {
							migrationStatus,
							percent,
							startTime: localizedStartTime,
						} );
						return;
					}

					this.setMigrationState( {
						migrationStatus,
						percent,
					} );
				}
			} )
			.catch( error => {
				const { message = '' } = error;
				this.setMigrationState( { migrationStatus: 'error', errorMessage: message } );
			} );
	};

	isInProgress = () => {
		return includes( [ 'backing-up', 'restoring' ], this.state.migrationStatus );
	};

	isFinished = () => {
		return includes( [ 'done', 'error', 'unknown' ], this.state.migrationStatus );
	};

	renderLoading() {
		return (
			<CompactCard>
				<span className="migrate__placeholder">Loading...</span>
			</CompactCard>
		);
	}

	renderMigrationComplete() {
		const { targetSite } = this.props;
		const viewSiteURL = get( targetSite, 'URL' );

		return (
			<>
				<FormattedHeader
					className="migrate__section-header"
					headerText="Congratulations!"
					align="left"
				/>
				<CompactCard>
					<div className="migrate__status">Your import has completed successfully.</div>
					<Button primary href={ viewSiteURL }>
						View site
					</Button>
					<Button onClick={ this.resetMigration }>Start over</Button>
				</CompactCard>
			</>
		);
	}

	chooseImportType = type => {
		this.setState( { chosenImportType: type } );
	};

	handleImportRedirect = () => {
		const { isTargetSiteAtomic, targetSiteSlug } = this.props;

		if ( isTargetSiteAtomic ) {
			window.location.href = `https://${ targetSiteSlug }/wp-admin/import.php`;
		} else {
			redirectTo( `/import/${ targetSiteSlug }/?engine=wordpress` );
		}
	};

	getJetpackOrUpgradeMessage = () => {
		const { sourceSite, sourceSiteHasJetpack, isTargetSiteAtomic } = this.props;

		if ( ! sourceSiteHasJetpack ) {
			const sourceSiteDomain = get( sourceSite, 'domain' );
			return (
				<p>
					You need to have{ ' ' }
					<a href={ `https://wordpress.com/jetpack/connect?url=${ sourceSiteDomain }` }>Jetpack</a>{ ' ' }
					installed on your site to be able to import over everything
				</p>
			);
		}

		if ( ! isTargetSiteAtomic ) {
			return (
				<p>A Business Plan (i) is required to import everything. Importing only content is free.</p>
			);
		}
	};

	renderMigrationConfirmation() {
		const { sourceSite, targetSite, targetSiteSlug, sourceSiteHasJetpack } = this.props;

		const sourceSiteDomain = get( sourceSite, 'domain' );
		const targetSiteDomain = get( targetSite, 'domain' );
		const backHref = `/migrate/${ targetSiteSlug }`;

		return (
			<>
				<HeaderCake backHref={ backHref }>Import { sourceSiteDomain }</HeaderCake>
				<div className="migrate__sites">
					<div className="migrate__sites-item">
						<Site site={ sourceSite } indicator={ false } />
					</div>
					<div className="migrate__sites-arrow-wrapper">
						<Gridicon className="migrate__sites-arrow" icon="arrow-right" />
					</div>
					<div className="migrate__sites-item">
						<Site site={ targetSite } indicator={ false } />
						<div class="migrate__sites-labels-container">
							<span className="migrate__token-label">This site</span>
						</div>
					</div>
				</div>
				<CompactCard>
					<h3>What do you want to import?</h3>

					{ this.getJetpackOrUpgradeMessage() }

					<ImportTypeChoice
						onChange={ this.chooseImportType }
						radioOptions={ {
							everything: {
								title: 'Everything',
								labels: [ 'Upgrade Required', 'Something Else', 'Third bubble' ],
								description: "All your site's content, themes, plugins, users and settings",
								enabled: sourceSiteHasJetpack,
							},
							'content-only': {
								key: 'content-only',
								title: 'Content only',
								labels: [ 'Free', 'Only content', 'Third bubble' ],
								description: 'Import posts, pages, comments, and media.',
								enabled: true,
							},
						} }
					/>
					{ this.state.chosenImportType === 'everything' ? (
						<MigrateButton onClick={ this.startMigration } targetSiteDomain={ targetSiteDomain } />
					) : null }
					{ this.state.chosenImportType === 'content-only' ? (
						<Button primary onClick={ this.handleImportRedirect }>
							Continue
						</Button>
					) : null }
					<Button className="migrate__cancel" href={ backHref }>
						Cancel
					</Button>
				</CompactCard>
			</>
		);
	}

	renderMigrationError() {
		return (
			<Card className="migrate__pane">
				<FormattedHeader
					className="migrate__section-header"
					headerText="Import failed"
					align="center"
				/>
				<div className="migrate__status">
					There was an error with your import.
					<br />
					{ this.state.errorMessage }
				</div>
				<Button primary onClick={ this.resetMigration }>
					Back to your site
				</Button>
			</Card>
		);
	}

	renderMigrationProgress() {
		const { sourceSite, targetSite } = this.props;
		const sourceSiteDomain = get( sourceSite, 'domain' );
		const targetSiteDomain = get( targetSite, 'domain' );
		const subHeaderText = (
			<>
				{ "We're moving everything from " }
				<span className="migrate__domain">{ sourceSiteDomain }</span>
				{ ' to ' }
				<span className="migrate__domain">{ targetSiteDomain }</span>.
			</>
		);

		return (
			<>
				<Interval onTick={ this.updateFromAPI } period={ EVERY_TEN_SECONDS } />
				<Card className="migrate__pane">
					<img
						className="migrate__illustration"
						src={ '/calypso/images/illustrations/waitTime-plain.svg' }
						alt=""
					/>
					<FormattedHeader
						className="migrate__section-header"
						headerText="Import in progress"
						subHeaderText={ subHeaderText }
						align="center"
					/>
					{ this.renderStartTime() }
					{ this.renderProgressBar() }
					{ this.renderProgressList() }
				</Card>
			</>
		);
	}

	renderStartTime() {
		if ( isEmpty( this.state.startTime ) ) {
			return <div className="migrate__start-time">&nbsp;</div>;
		}

		return <div className="migrate__start-time">Import started { this.state.startTime }</div>;
	}

	renderProgressBar() {
		if ( this.isInProgress() ) {
			return (
				<ProgressBar isPulsing className="migrate__progress" value={ this.state.percent || 0 } />
			);
		}

		if ( this.isFinished() ) {
			return <ProgressBar className="migrate__progress is-complete" value={ 100 } />;
		}
	}

	renderProgressIcon( progressState ) {
		const { migrationStatus } = this.state;

		if ( progressState === migrationStatus ) {
			return <Spinner />;
		}

		if ( 'backing-up' === progressState ) {
			return <Gridicon className="migrate__progress-item-icon-success" icon="checkmark-circle" />;
		}

		return (
			<img
				alt=""
				src="/calypso/images/importer/circle-gray.svg"
				className="migrate__progress-item-icon-todo"
			/>
		);
	}

	renderProgressItem( progressState ) {
		const { migrationStatus } = this.state;
		const { sourceSite, targetSite } = this.props;
		const sourceSiteDomain = get( sourceSite, 'domain' );
		const targetSiteDomain = get( targetSite, 'domain' );

		let progressItemText;
		switch ( progressState ) {
			case 'backing-up':
				progressItemText = (
					<span>
						Backed up from <span className="migrate__domain">{ sourceSiteDomain }</span>
					</span>
				);
				if ( migrationStatus === 'backing-up' ) {
					progressItemText = (
						<span>
							Backing up from <span className="migrate__domain">{ sourceSiteDomain }</span>
						</span>
					);
				}
				break;
			case 'restoring':
				progressItemText = (
					<span>
						Restoring to <span className="migrate__domain">{ targetSiteDomain }</span>
					</span>
				);
				break;
		}

		return (
			<li key={ `progress-${ progressState }` } className="migrate__progress-item">
				<div className="migrate__progress-item-icon">
					{ this.renderProgressIcon( progressState ) }
				</div>
				<div className="migrate__progress-item-text">{ progressItemText }</div>
			</li>
		);
	}

	renderProgressList() {
		const steps = [ 'backing-up', 'restoring' ];

		return (
			<ul className="migrate__progress-list">
				{ steps.map( step => this.renderProgressItem( step ) ) }
			</ul>
		);
	}

	renderSourceSiteSelector() {
		return (
			<>
				<FormattedHeader
					className="migrate__section-header"
					headerText="Import your WordPress site to WordPress.com"
					align="left"
				/>
				<CompactCard className="migrate__card">
					<CardHeading>Select the Jetpack enabled site you want to import.</CardHeading>
					<div className="migrate__explain">
						If your site is connected to your WordPress.com account through Jetpack, we can import
						all your content, users, themes, plugins, and settings.
					</div>
					<SiteSelector
						className="migrate__source-site"
						onSiteSelect={ this.setSourceSiteId }
						filter={ this.jetpackSiteFilter }
					/>
					<div className="migrate__import-instead">
						Don't see it? You can still{ ' ' }
						<a href={ this.getImportHref() }>import just your content</a>.
					</div>
				</CompactCard>
				{ this.renderCardBusinessFooter() }
			</>
		);
	}

	render() {
		const { sourceSiteId } = this.props;

		let migrationElement;

		switch ( this.state.migrationStatus ) {
			case 'inactive':
				migrationElement = sourceSiteId
					? this.renderMigrationConfirmation()
					: this.renderSourceSiteSelector();
				break;

			case 'backing-up':
			case 'restoring':
				migrationElement = this.renderMigrationProgress();
				break;

			case 'done':
				migrationElement = this.renderMigrationComplete();
				break;

			case 'error':
				migrationElement = this.renderMigrationError();
				break;

			case 'unknown':
			default:
				migrationElement = this.renderLoading();
		}

		return (
			<Main>
				<DocumentHead title="Migrate" />
				<SidebarNavigation />
				{ migrationElement }
			</Main>
		);
	}
}

const navigateToSelectedSourceSite = sourceSiteId => ( dispatch, getState ) => {
	const state = getState();
	const sourceSite = getSite( state, sourceSiteId );
	const sourceSiteSlug = get( sourceSite, 'slug', sourceSiteId );
	const targetSiteSlug = getSelectedSiteSlug( state );

	page( `/migrate/from/${ sourceSiteSlug }/to/${ targetSiteSlug }` );
};

export default connect(
	( state, ownProps ) => {
		const targetSiteId = getSelectedSiteId( state );
		return {
			isTargetSiteAtomic: !! isSiteAutomatedTransfer( state, targetSiteId ),
			isTargetSiteJetpack: !! isJetpackSite( state, targetSiteId ),
			sourceSite: ownProps.sourceSiteId && getSite( state, ownProps.sourceSiteId ),
			sourceSiteHasJetpack: false,
			targetSite: getSelectedSite( state ),
			targetSiteId,
			targetSiteImportAdminUrl: getSiteAdminUrl( state, targetSiteId, 'import.php' ),
			targetSiteSlug: getSelectedSiteSlug( state ),
		};
	},
	{ navigateToSelectedSourceSite, updateSiteMigrationStatus }
)( localize( SectionMigrate ) );
