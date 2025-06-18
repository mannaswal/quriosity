/**
 * Server mutation to delete an attachment from UploadThing
 */
export const deleteFromUploadThing = async (uploadThingKey: string) => {
	await fetch('/api/uploadthing', {
		method: 'DELETE',
		body: JSON.stringify({ uploadThingKey }),
	});
};
