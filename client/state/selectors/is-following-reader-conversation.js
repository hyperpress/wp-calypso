/*
 */

/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import { key } from 'state/reader/conversations/utils';
import { CONVERSATION_FOLLOW_STATUS } from 'state/reader/conversations/follow-status';

/*
 * Get the conversation following status for a given post
 *
 * @param  {object}  state  Global state tree
 * @param  {object} params Params including siteId and postId
 * @returns {boolean} Is the user following this conversation?
 */
export default function isFollowingReaderConversation( state, { siteId, postId } ) {
	return (
		get( state, [ 'reader', 'conversations', 'items', key( siteId, postId ) ] ) ===
		CONVERSATION_FOLLOW_STATUS.following
	);
}
