import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT } from '../firebase';


const Comunicados = ({ userId, userRole, userFullName }) => {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [commentContents, setCommentContents] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isManagerRole = () => {
        return userRole === 'lider_de_calle' || userRole === 'administrador' || userRole === 'vocera_principal' || userRole === 'admin';
    };

    // Fetch posts and their comments
    useEffect(() => {
        const postsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'comunicados');
        const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(postDoc => {
                const post = { id: postDoc.id, ...postDoc.data(), comments: [] };

                // Fetch comments for each post
                const commentsCollectionRef = collection(postDoc.ref, 'comments');
                const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
                onSnapshot(commentsQuery, (commentsSnapshot) => {
                    post.comments = commentsSnapshot.docs.map(commentDoc => ({
                        id: commentDoc.id,
                        ...commentDoc.data()
                    }));
                    // This is a bit complex; we need to update the state in a way that React understands
                    setPosts(currentPosts => currentPosts.map(p => p.id === post.id ? post : p));
                });

                return post;
            });
            setPosts(postsData);
            setLoading(false);
        }, (err) => {
            setError('Error al cargar los comunicados.');
            setLoading(false);
            console.error(err);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim()) {
            setError('El contenido del comunicado no puede estar vacío.');
            return;
        }
        setError('');
        try {
            const postsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'comunicados');
            await addDoc(postsCollectionRef, {
                content: newPostContent,
                authorId: userId,
                authorName: userFullName,
                createdAt: serverTimestamp()
            });
            setNewPostContent('');
        } catch (err) {
            setError('Error al crear el comunicado.');
            console.error(err);
        }
    };

    const handleCreateComment = async (e, postId) => {
        e.preventDefault();
        const commentContent = commentContents[postId] || '';
        if (!commentContent.trim()) {
            setError('El comentario no puede estar vacío.');
            return;
        }
        setError('');
        try {
            const commentsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'comunicados', postId, 'comments');
            await addDoc(commentsCollectionRef, {
                content: commentContent,
                authorId: userId,
                authorName: userFullName,
                createdAt: serverTimestamp()
            });
            setCommentContents({ ...commentContents, [postId]: '' });
        } catch (err) {
            setError('Error al añadir el comentario.');
            console.error(err);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-indigo-200 pb-2">
                Comunicados de la Comunidad
            </h2>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded-md">{error}</div>}

            {isManagerRole() && (
                <form onSubmit={handleCreatePost} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                    <h3 className="text-lg font-semibold text-indigo-700">Crear Nuevo Comunicado</h3>
                    <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Escribe tu comunicado aquí..."
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        rows="3"
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Publicar</button>
                </form>
            )}

            {loading && <p>Cargando comunicados...</p>}

            <div className="space-y-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Publicado por <span className="font-semibold">{post.authorName}</span> el {post.createdAt?.toDate().toLocaleString()}
                        </p>
                        <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-2">
                            {post.comments.map(comment => (
                                <div key={comment.id} className="bg-gray-100 p-2 rounded-md">
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        - <span className="font-semibold">{comment.authorName}</span>, {comment.createdAt?.toDate().toLocaleString()}
                                    </p>
                                </div>
                            ))}
                            <form onSubmit={(e) => handleCreateComment(e, post.id)} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={commentContents[post.id] || ''}
                                    onChange={(e) => setCommentContents({ ...commentContents, [post.id]: e.target.value })}
                                    placeholder="Escribe un comentario..."
                                    className="flex-grow p-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700">Comentar</button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Comunicados;