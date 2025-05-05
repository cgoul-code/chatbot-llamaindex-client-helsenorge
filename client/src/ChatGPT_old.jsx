import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, CheckBox, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from 'react-native';
import * as MdIcons from "react-icons/md";
import * as TiIcons from "react-icons/ti";
import { Tooltip } from 'react-tooltip';
import ReactMarkdown from 'react-markdown';



const timer = ms => new Promise(res => setTimeout(res, ms))
let webserverEndPoint = "";
if (process.env.NODE_ENV === 'development') {
    // You are running the app locally in development mode
    console.log('Running in development mode');
    webserverEndPoint = 'http://localhost:80/chat';
} else {
    // You are running the app in production or some other environment
    console.log('Running in production mode');
    webserverEndPoint = 'https://chatbot3-llama-server-cpc2cggya7dsh3fn.westeurope-01.azurewebsites.net/chat';
}

console.log('webserverEndPoint', webserverEndPoint);




export default function ChatGPT() {
    const [data, setData] = useState([]);
    const [textInput, setTextInput] = useState("");
    const [prevTextInput, setPrevTextInput] = useState("");
    const [isTextInputFocused, setTextInputFocused] = useState(false)
    const [isSending, setImageVisibility] = useState(false);
    const [similarity_top_k, setSimilarity_top_k] = useState("10");
    const [expandedSection2, setExpandedSection2] = useState(false);
    const [expandedSection3, setExpandedSection3] = useState(false);
    const [response_mode, setResponse_mode] = useState("tree_summarize");
    const [similarity_cutoff, setSimilarity_cutoff] = useState("0.75");
    const [semanticEvaluation, setSemanticEvaluation] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [responses, setResponses] = useState([]); // Array of markdown responses
    const [loading, setLoading] = useState(false);

    const [tokenCounter, setTokenCounter] = useState(false);
    const [showContext, setShowContext] = useState(false);
    const [detailedResponse, setDetailedResponse] = useState(true);
    const [detailedResponseWithoutLists, setDetailedResponseWithoutLists] = useState(false)
    const [displaySemanticEvaluation, setDisplaySemanticEvaluation] = useState(false)
    const [vectorIndex, setVectorIndex] = useState("prevensjonsguiden");
    //const [refTextSelection, setRefTextSelection] = useState(true);
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const [bottomSectionHeight, setBottomSectionHeight] = useState(100);
    const [promptHeight, setPromptHeight] = useState(80);
    const [promptSectionHeight, setPromptSectionHeight] = useState(100);
    const [topSectionHeight, setTopSectionHeight] = useState(20);
    const [modelName, setModelName] = useState("gpt-4o");
    //const [responseWordsLength, setResponseWordsLength] = useState(200);
    const [empathiMode, setEmpathiMode] = useState(false);
    const [youngAgeMode, setYoungAgeMode] = useState(false);
    const [chatGPTOnly, setChatGPTOnly] = useState(false);
    const [subQueries, setSubQueries] = useState(false)
    const [showSubQueries, setShowSubQueries] = useState(false)
    const empathiModeMsg = '\nYou will respond with empathy. ';
    const youngAgeModeMsg = '\nYou will answer in language that young people aged 13 to 19 understand.';
    const detailedResponseMsg = '\n3. Provide a detailed explanation';
    const detailedResponseWithoutListsMsg = '\n3. Provide a detailed explanation without using any lists'
    const scrollViewRef = useRef(); // Reference to ScrollView

    //let defaultSystemMessage = `You are a helpful assistant answering in norwegian, you will be provided with a user query.Your task is to answer only the provided context information.If you do not find the answer in the provided context, answer in norwegian: "Beklager, jeg fant ikke svaret i referansetekstene!". Only if the answer is found in the context information, ${empathiMode ? empathiModeMsg : ""}answer with ${responseWordsLength} words ${youngAgeMode ? youngAgeModeMsg : ""}`
    let defaultSystemMessage =
        `You are a helpful assistant, and you will be given a user request.${empathiMode ? empathiModeMsg : ""}${youngAgeMode ? youngAgeModeMsg : ""}` +
        `\nSome rules to follow:` +
        `\n1. Always answer the request using the given context information and not prior knowledge.,` +
        `\n2. If you cannot find the answer in the given context information, reply: "I'm sorry, I couldn't find the answer in the given context."` +
        `${detailedResponse ? detailedResponseMsg : ""}` +
        `${detailedResponseWithoutLists ? detailedResponseWithoutListsMsg : ""}.`

    let defaultSystemMessageChatGPTOnly =
        `You are a helpful assistant, and you will be given a user request.${empathiMode ? empathiModeMsg : ""}${youngAgeMode ? youngAgeModeMsg : ""}` +
        `${detailedResponse ? detailedResponseMsg : ""}` +
        `${detailedResponseWithoutLists ? detailedResponseWithoutListsMsg : ""}.`

    const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);


    useEffect(() => {

        const handleResize = () => {
            setWindowHeight(window.innerHeight);


        };

        //setSystemMessage(`You are a helpful assistant answering in norwegian, you will be provided with a user query.Your task is to answer only the provided context information.If you do not find the answer in the provided context, answer in norwegian: "Beklager, jeg fant ikke svaret i referansetekstene!". Only if the answer is found in the context information, ${empathiMode ? empathiModeMsg : ""}answer with ${responseWordsLength} words ${youngAgeMode ? youngAgeModeMsg : ""}`);
        if (chatGPTOnly) {
            setSystemMessage(defaultSystemMessageChatGPTOnly)
        } else {
            setSystemMessage(defaultSystemMessage)
        }

        window.addEventListener('resize', handleResize);

        // Cleanup the event listener when the component unmounts
        return () => window.removeEventListener('resize', handleResize);
    }, [detailedResponse, empathiMode, youngAgeMode, chatGPTOnly, defaultSystemMessage, defaultSystemMessageChatGPTOnly]);

    function getVectorIndex(data) {

        if (data) {
            let value = data.value;
            return value;
        }
        return null;

    }


    function validateInputs(text, type) {
        if (text.length > 0) {
            let numreg = /^[0-9]+$/;
            let floatReg = /^[+-]?\d+(\.\d+)?$/; // Regular expression for float numbers (including integers)

            if ((type === 'similarity_top_k') || (type === 'responseWordsLength')) {
                if (numreg.test(text)) {
                    return true
                } else {
                    alert("please enter numbers only");
                    return false
                }
            }
            if (type === 'similarity_cutoff') {
                const floatValue = parseFloat(text);
                if (floatValue >= 0 && floatValue <= 1) {
                    return true;
                } else {
                    alert("Please enter a float between 0 and 1 only");
                    return false;
                }
            }
            // if (type === 'systemMessage') {
            //     if (text.length === 0)
            //         setSystemMessage(defaultSystemMessage);

            // }

        }
        return true;
    }

    const toggleExpandedSection2 = () => {
        setExpandedSection2(!expandedSection2);
    };
    const toggleExpandedSection3 = () => {
        setExpandedSection3(!expandedSection3);
    };


    const toggleActivityIndicatorVisibility = () => {
        setImageVisibility(!isSending);
    };
    const hideActivityIndicator = () => {
        setImageVisibility(false);
    }

    const list = useRef(null);

    const clearInput = () => {
        setTextInput("");
        setPromptHeight(80);
    };
    const clearAll = () => {
        clearInput();
        setData([]);
        hideActivityIndicator();
    };

    const seperator = () => {
        return (
            <View style={styles.seperator} />
        )
    };

    const handleChangeResponse_mode = (event) => {
        setResponse_mode(event.target.value);
    };
    const handleChangeModelName = (event) => {
        setModelName(event.target.value);
    };
    const handleChangeVectorIndex = (event) => {
        setVectorIndex(event.target.value);
    };

    async function readAndDisplayResponse(response, display, userMsg, existingResp) {

        let text = "";
        let links = [];

        try {
            const responseData = await response.json();
            text = responseData.text || "";
            links = responseData.links || [];

            if (display) {
                const parsedParts = parseText(text, links);
                setData((prevData) => [
                    ...prevData,
                    { type: 'Deg', buttonText: "Deg", text: userMsg },
                    { type: 'bot', buttonText: "HelseSvar", parts: parsedParts }
                ]);
            }

            list.current.scrollToEnd({ animated: true });
            return text;
        } catch (error) {
            console.error("Error reading the response:", error);
        }
    }

    // async function readAndDisplayResponse(response, display, userMsg, existingResp) {
    //     const reader = response.body
    //         .pipeThrough(new TextDecoderStream())
    //         .getReader();
    //     let text = "";
    //     let incompleteText = "";

    //     // Add the user's message and an empty bot message at the start
    //     if (display) {
    //         setData((prevData) => [
    //             ...prevData,
    //             { type: 'Deg', buttonText: "Deg", text: userMsg },
    //             { type: 'bot', buttonText: "HelseSvar", parts: [] }
    //         ]);
    //     }

    //     try {
    //         while (true) {
    //             const { value, done } = await reader.read();
    //             if (done) break;

    //             let chunk = incompleteText + value;
    //             incompleteText = "";

    //             // Handle incomplete patterns (as per your existing code)
    //             const lastSpecialChar = Math.max(
    //                 chunk.lastIndexOf('**'),
    //                 chunk.lastIndexOf('[')
    //             );
    //             if (lastSpecialChar > chunk.length - 3) {
    //                 incompleteText = chunk.slice(lastSpecialChar);
    //                 chunk = chunk.slice(0, lastSpecialChar);
    //             }

    //             text += chunk;

    //             if (display) {
    //                 const parsedParts = parseText(existingResp + text);
    //                 console.log(parsedParts);

    //                 setData((prevData) => {
    //                     const newData = [...prevData];
    //                     const lastIndex = newData.length - 1;

    //                     // Update the last bot message
    //                     if (newData[lastIndex].type === 'bot') {
    //                         newData[lastIndex] = {
    //                             ...newData[lastIndex],
    //                             parts: parsedParts
    //                         };
    //                     }
    //                     return newData;
    //                 });
    //             }

    //             await timer(5);
    //             list.current.scrollToEnd({ animated: true });
    //         }

    //         // Handle any remaining incomplete text
    //         if (incompleteText) {
    //             text += incompleteText;
    //             if (display) {
    //                 const parsedParts = parseText(existingResp + text);

    //                 setData((prevData) => {
    //                     const newData = [...prevData];
    //                     const lastIndex = newData.length - 1;

    //                     // Update the last bot message
    //                     if (newData[lastIndex].type === 'bot') {
    //                         newData[lastIndex] = {
    //                             ...newData[lastIndex],
    //                             parts: parsedParts
    //                         };
    //                     }
    //                     return newData;
    //                 });
    //             }
    //         }
    //     } catch (error) {
    //         console.error("Error reading the stream:", error);
    //     } finally {
    //         reader.releaseLock();
    //     }
    //     list.current.scrollToEnd({ animated: true });
    //     return text;
    // }







    function parseText(text) {
        const regex = /(\*\*.*?\*\*)|(\[.*?\]\(.*?\))/g;
        const parts = [];
        let lastIndex = 0;

        let match;
        while ((match = regex.exec(text)) !== null) {
            // Text before the matched pattern
            if (match.index > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, match.index),
                    bold: false,
                    link: null,
                });
            }

            const matchedText = match[0];

            if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
                // Bold text
                parts.push({
                    text: matchedText.slice(2, -2),
                    bold: true,
                    link: null,
                });
            } else if (matchedText.startsWith('[')) {
                // Link text
                const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(matchedText);
                if (linkMatch) {
                    const title = linkMatch[1];
                    const url = linkMatch[2];
                    parts.push({
                        text: title,
                        bold: false,
                        link: url,
                    });
                }
            }

            lastIndex = regex.lastIndex;
        }

        // Text after the last matched pattern
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                bold: false,
                link: null,
            });
        }

        return parts;
    }


    // const handleSend = async (text = '') => {
    //     let userMsg = "";
    //     //"Prefer shorter answers. Keep your response to 100 words or less.",
    //     console.log('text para', text);

    //     try {

    //         let completeRespText = "";
    //         if (text !== '')
    //             userMsg = text;
    //         else
    //             userMsg = textInput

    //         const response = await fetch(webserverEndPoint, {
    //             method: 'POST',
    //             headers: {
    //                 "Cache-Control": "no-cache",
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({
    //                 messages: [{
    //                     role: "system",
    //                     content: systemMessage,
    //                 }, {
    //                     role: "user",
    //                     content: "Query: " + userMsg
    //                 }],
    //                 modelName: modelName,
    //                 similarity_top_k: similarity_top_k,
    //                 response_mode: response_mode,
    //                 similarity_cutoff: similarity_cutoff,
    //                 chatGPTOnly: chatGPTOnly,
    //                 subQueries: subQueries,
    //                 showSubQueries: showSubQueries,
    //                 semanticEvaluation: semanticEvaluation,
    //                 tokenCounter: tokenCounter,
    //                 vectorIndex: vectorIndex,
    //                 showContext: showContext,
    //                 displaySemanticEvaluation: displaySemanticEvaluation,
    //                 stream: semanticEvaluation ? false : true,
    //             }),
    //         });

    //         await readAndDisplayResponse(response, true, userMsg, completeRespText);

    //         clearInput();

    //         hideActivityIndicator();

    //     } catch (error) {
    //         console.log("error", error);
    //         hideActivityIndicator();
    //     }

    // }
    const handleSend = async (text = '') => {
        let userMsg = text || textInput;

        try {
            setLoading(true);

            const response = await fetch(webserverEndPoint, {
                method: 'POST',
                headers: {
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemMessage },
                        { role: "user", content: "Query: " + userMsg }
                    ],
                    modelName,
                    similarity_top_k,
                    response_mode,
                    similarity_cutoff,
                    chatGPTOnly,
                    subQueries,
                    showSubQueries,
                    semanticEvaluation,
                    tokenCounter,
                    vectorIndex,
                    showContext,
                    displaySemanticEvaluation,
                    stream: !semanticEvaluation,
                }),
            });

            const responseText = await response.text();
            setResponses((prevResponses) => [...prevResponses, responseText]); // Add new response to array
            setLoading(false);

            // Scroll to the end after the response is updated
            setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100); // Adding a slight delay ensures the content is fully rendered
        } catch (error) {
            console.log("error", error);
            setLoading(false);
        }
    };



    return (
        <View style={styles.container}>
            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (topSectionHeight !== layout.height) {
                        setTopSectionHeight(layout.height); // assuming you want to store the entire layout 
                    }
                }}
                style={[styles.row, { flexDirection: 'row', }]}>
                <View style={[styles.col1, { flex: 2, }]}></View>
                <View style={[styles.col4, { flex: 4, }]}>
                    <Text style={[styles.title, { textAlign: 'left', padding: 2 }]}>HelseSvar</Text>

                </View>

                <View style={[styles.col4, {
                    flex: 4,
                    paddingTop: 10,
                    paddingRight: 10,
                    paddingBottom: 4,
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                }]}>

                    <select style={styles.selectContainer}
                        value={modelName}
                        onChange={handleChangeModelName}>
                        <option value="gpt-o1-preview">ChatGPT-o1-preview</option>
                        <option value="gpt-4o">ChatGPT-4o</option>
                        <option value="gpt432k">ChatGPT-4 (32K)</option>
                        <option value="gpt4">ChatGPT-4 (8K)</option>
                        <option value="gpt-35-turbo">ChatGPT-35</option>
                    </select>

                    <select style={styles.selectContainer}
                        value={vectorIndex}
                        onChange={handleChangeVectorIndex}>
                        {/* <option value="prevensjonsguiden">Prevensjonsguiden</option> */}
                        <option value="prevensjon">Prevensjon - Temasider</option>
                        <option value="ungno1000spmprevensjon">Prevensjon - 1000 spørsmål&svar</option>
                        {/* <option value="ungnomobbing">Temaside om mobbing</option> */}
                        {/* <option value="ungnoalkohol">Temaside om alkohol</option> */}
                        {/* option value="ungno_canabis">Temaside om canabis</option> */}
                        <option value="ungnotobakk">Tobakk - Temasider</option>
                        {/* <option value="ungno100spmtobakk">100 spørsmål&svar om tobakk</option> */}
                        <option value="ungno500spmtobakk">Tobakk - 1000 spørsmål&svar</option>
                        {/* <option value="barneombudet">Barneombudet - dine rettigheter</option> */}
                        {/* // <option value="helsenorgeverktoy">Helsenorge - verktøy</option> */}
                        {/* <option value="hvaerinnafor">Seksuell atferd - hva er innafor?</option> */}
                        {/* <option value="zanzu">Zanzu, min kropp i ord og bilder</option> */}
                        {/* <option value="spillavhengig">Temasider om spillavhengighet</option> */}
                        <option value="psykiskhelse">Psykisk helse - Temasider</option>
                        <option value="ungno1000spmpsykiskhelse">Psykisk helse - 1000 spørsmål&svar</option>
                        {/* <option value="graphDatabase">Mortality codes for ICD 11</option> */}
                        <option value="ungno2000">Alle temaene - 5000 spørsmål&svar</option>
                        <option value="psassa">Hva er innafor - Temasider</option>
                    </select>

                    {/* <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Model:</Text> */}


                </View>
                <View style={[styles.col1, { flex: 2 }]}></View>
            </View>

            <View style={[styles.row, { height: windowHeight - topSectionHeight - bottomSectionHeight - promptSectionHeight, }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, {
                    paddingTop: 0,
                    minHeight: Math.min(300, windowHeight - topSectionHeight - bottomSectionHeight - promptSectionHeight), flex: 8
                }]}>

                    {/* <FlatList
                        ref={list}
                        data={data}
                        keyExtractor={(item, index) => index.toString()}
                        ItemSeparatorComponent={seperator}
                        ListFooterComponent={<View style={{ height: 20 }} />}
                        style={[styles.body, { borderRadius: 4 }]}
                        renderItem={({ item }) => {
                            if (item.type === 'Deg') {
                                return (
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.roleUser}>{item.buttonText}</Text>
                                        <View style={styles.messageText}>
                                            <Text style={styles.normalText}>
                                                {item.text}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            } else if (item.type === 'bot') {
                                return (
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.roleAssistant}>{item.buttonText}</Text>
                                        <View style={styles.messageText}>
                                            <Text>
                                                {item.parts.map((part, index) => {
                                                    const partText = part.text
                                                    //console.log('Part Text after:', JSON.stringify(partText))
                                                    if (part.link) {
                                                        return (

                                                            <TouchableOpacity
                                                                key={index}
                                                                onPress={() => Linking.openURL(part.link)}
                                                                style={styles.linkButton}
                                                            >
                                                                <Text style={styles.linkButtonText}>
                                                                    {partText}
                                                                </Text>
                                                            </TouchableOpacity>);
                                                    } else if (part.bold) {
                                                        return (
                                                            <Text key={index} style={styles.boldText}>
                                                                {partText}
                                                            </Text>
                                                        );
                                                    } else {
                                                        return (
                                                            <Text key={index} style={styles.normalText}>
                                                                {partText}
                                                            </Text>
                                                        );
                                                    }
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            } else {
                                return null;
                            }
                        }}
                    /> */}

                    <ScrollView ref={scrollViewRef} style={[styles.body, { borderRadius: 4 }]}>
                        {responses.map((response, index) => (
                            <View key={index}>
                                <ReactMarkdown>{response}</ReactMarkdown>
                                {/* Separator between responses */}
                                {index < responses.length - 1 && <View style={styles.separator} />}
                            </View>
                        ))}
                        {loading && <ActivityIndicator size="large" color="#0000ff" />} {/* Optional loading indicator */}
                    </ScrollView>

                </View>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (promptSectionHeight !== layout.height) {
                        setPromptSectionHeight(layout.height); // assuming you want to store the entire layout 
                    }
                }}
                style={[styles.row, { minHeight: 100 }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, { flex: 8 }]}>
                    <TextInput
                        // style={[styles.prompt, { height: Math.max(80, height), width: "100%", outlineStyle: 'none', borderColor: isTextInputFocused === true ? '#3699' : '#3699', borderWidth: 1, }]}
                        style={[styles.prompt, { height: Math.max(80, promptHeight), width: "100%", borderColor: isTextInputFocused === true ? '#3699' : '#3699', /*borderWidth: 1,*/ }]}

                        placeholder="Angi spørsmålet her.."
                        spellCheck="false"
                        readOnly={false}
                        multiline
                        rows={5}
                        maxLength={300000}
                        value={textInput}
                        onContentSizeChange={(e) => {
                            const newHeight = e.nativeEvent.contentSize.height;
                            setPromptHeight(newHeight);
                        }}
                        onChangeText={text => setTextInput(text)}
                        onFocus={() => setTextInputFocused(true)}
                        onBlur={() => setTextInputFocused(false)}
                        onSubmitEditing={() => { setTextInputFocused(false); console.log('onSubmitEditing') }}
                        onEndEditing={() => { setTextInputFocused(false); console.log('onEndEditing') }}
                    />


                    <View style={{
                        flexDirection: 'row',
                        width: window.width,
                        margin: 0,
                        padding: 0,
                        paddingRight: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 0,
                        borderColor: '#025169',
                        borderRadius: 0,
                        backgroundColor: '#ccdce1'
                    }}>
                        <View style={{
                            paddingRight: 10,
                        }}>

                            <button style={{ borderWidth: 2, }}
                                data-tooltip-id="my-tooltip_resend"
                                data-tooltip-content="Send på nytt"
                                onClick={() => { console.log('prev:', prevTextInput); setTextInput(prevTextInput); handleSend(prevTextInput); /* toggleActivityIndicatorVisibility(); */ }}
                            >
                                <TiIcons.TiArrowRepeat />
                                <Tooltip id="my-tooltip_resend" />

                            </button>
                        </View>
                        <View style={{
                            paddingRight: 10,
                        }}>

                            <button style={{ borderWidth: 2, }}
                                data-tooltip-id="my-tooltip_slett"
                                data-tooltip-content="Tøm listen"
                                onClick={() => { clearAll(); }}
                            >
                                <MdIcons.MdOutlineDeleteSweep />
                                <Tooltip id="my-tooltip_slett" />

                            </button>
                        </View>
                        <View>

                            {!isSending && (
                                <button style={{ borderWidth: 2 }}
                                    data-tooltip-id="my-tooltip_send"
                                    data-tooltip-content="Send"
                                    onClick={() => { setPrevTextInput(textInput); handleSend(); /* toggleActivityIndicatorVisibility(); */ }}
                                >
                                    <MdIcons.MdSend />
                                    <Tooltip id="my-tooltip_send" />

                                </button>
                            )}
{/*                             {isSending && (
                                <View style={[styles.horizontal]}>
                                    <ActivityIndicator size="small" color="#0000ff" />
                                </View>
                            )} */}
                        </View>

                    </View>
                </View>
                <View style={[styles.col1, { flex: 2 }]}>

                </View>
            </View>


            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (bottomSectionHeight !== layout.height) {
                        setBottomSectionHeight(layout.height); // assuming you want to store the entire layout object
                    }
                }}

                style={[styles.row, { backgroundColor: '#ede5f3', }]}>

                <View style={[styles.col1, { flex: 2, }]}>
                </View>
                <View style={[styles.col2, { flex: 8, backgroundColor: '#025169', }]}>



                    <TouchableOpacity onPress={toggleExpandedSection2}>
                        <View style={[styles.row, { backgroundColor: '#025169', }]}>
                            {expandedSection2 && (<MdIcons.MdExpandLess color="white" />)}
                            {!expandedSection2 && (<MdIcons.MdExpandMore color="white" />)}
                            <Text style={[styles.ingress, { textAlign: 'left', color: 'white', fontWeight: 'bold' },]}>Innstillinger</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection2 && (
                        <View style={[styles.col2, { backgroundColor: '#025169', paddingLeft: 30 }]}>
                            <View style={[styles.row, { paddingTop: 8 }]}>

                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Instruksjon:</Text>

                                <TextInput
                                    style={[styles.prompt, { width: "100%" }]}
                                    placeholder={systemMessage}
                                    spellCheck="false"
                                    readOnly={false}
                                    multiline
                                    rows={5}
                                    maxLength={1000}
                                    value={systemMessage}
                                    onChangeText={text => setSystemMessage(text)}
                                />
                            </View>
                            <View style={[styles.row, { paddingTop: 2, }]}>
                                <View style={[styles.col4, { flex: 4, backgroundColor: '#025169', alignItems: 'right' }]}>

                                    {/* <View style={[styles.row, { paddingTop: 8 }]}>
                                       
                                        <TextInput
                                            style={[styles.input, { textAlign: 'right', borderRadius: 4, width: 50,  },]}
                                            editable
                                            value={responseWordsLength}
                                            inputMode="numeric"
                                            onChangeText={(text) => { setResponseWordsLength(text); }}
                                            onSubmitEditing={(value) => { setResponseWordsLength(value.nativeEvent.text); }}
                                            onBlur={(value) => { setResponseWordsLength(value.nativeEvent.text); }}
                                            onEndEditing={(value) => { setResponseWordsLength(value.nativeEvent.text); }}
                                        />
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Antall ord for svaret:</Text> 
                                    </View> */}
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Bruk SubQueries:</Text>
                                        <CheckBox
                                            value={subQueries}
                                            onValueChange={(newValue) => {
                                                setSubQueries(newValue);
                                                if (newValue) {
                                                    setModelName("gpt-4o"); // Set modelName to "gpt-4o" when subQueries is checked
                                                }
                                            }}
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            color='grey'
                                        />

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis detaljer med SubQueries:</Text>
                                        <CheckBox
                                            value={showSubQueries}
                                            onValueChange={(newValue) => {
                                                setShowSubQueries(newValue);

                                            }}
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Svar i detalj:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={detailedResponse}
                                            onValueChange={(newValue) => {
                                                setDetailedResponse(newValue);
                                                if (newValue) {
                                                    setDetailedResponseWithoutLists(false);
                                                }
                                            }}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Svar i detalj uten punktliste:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={detailedResponseWithoutLists}
                                            onValueChange={(newValue) => {
                                                setDetailedResponseWithoutLists(newValue);
                                                if (newValue) {
                                                    setDetailedResponse(false);
                                                }
                                            }}
                                            color='grey'
                                        />
                                    </View>

                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis empati:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={empathiMode}
                                            onValueChange={(newValue) => {
                                                setEmpathiMode(newValue);
                                            }}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Tilpass svaret til 13-19 år:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={youngAgeMode}
                                            onValueChange={(newValue) => {
                                                setYoungAgeMode(newValue);
                                            }}
                                            color='grey'
                                        />
                                    </View>


                                </View>
                                <View style={[styles.col4, { flex: 4, backgroundColor: '#025169' }]}>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>ChatGPT uten treningsdata (grunnmodell):</Text>
                                        <CheckBox style={[styles.checkbox, { marginLeft: 240, }]}
                                            value={chatGPTOnly}
                                            onValueChange={(newValue) => {
                                                setChatGPTOnly(newValue);
                                                setSemanticEvaluation(false);
                                            }}

                                            color='grey'
                                        />

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Evaluer svaret:</Text>
                                        <CheckBox style={[styles.checkbox, { marginLeft: 240, }]}
                                            value={semanticEvaluation}
                                            onValueChange={(newValue) => {
                                                setSemanticEvaluation(newValue);
                                                if (!newValue) {
                                                    setDisplaySemanticEvaluation(newValue);
                                                    setShowContext(newValue);
                                                }
                                            }}

                                            color='grey'
                                        />

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis likhet for referansetekstene:</Text>
                                        <CheckBox
                                            value={displaySemanticEvaluation}
                                            onValueChange={(newValue) => {
                                                setDisplaySemanticEvaluation(newValue);
                                                if (newValue) {
                                                    setSemanticEvaluation(newValue);
                                                } else {
                                                    setShowContext(newValue)
                                                }
                                            }}
                                            style={styles.checkbox}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis referansetekstene:</Text>
                                        <CheckBox
                                            value={showContext}
                                            onValueChange={(newValue) => {
                                                setShowContext(newValue);
                                                if (newValue) {
                                                    setSemanticEvaluation(newValue);
                                                    setDisplaySemanticEvaluation(newValue);

                                                }
                                            }}
                                            style={styles.checkbox}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis ChatGPT kostnad:</Text>
                                        <CheckBox
                                            value={tokenCounter}
                                            onValueChange={setTokenCounter}
                                            style={styles.checkbox}
                                            color='grey'
                                        />
                                    </View>

                                </View>

                            </View>

                        </View>
                    )}



                    <TouchableOpacity onPress={toggleExpandedSection3}>
                        <View style={[styles.row, { backgroundColor: '#025169', }]}>
                            {expandedSection3 && (<MdIcons.MdExpandLess color="white" />)}
                            {!expandedSection3 && (<MdIcons.MdExpandMore color="white" />)}
                            <Text style={[styles.ingress, { textAlign: 'left', color: 'white', fontWeight: 'bold' },]}>Tuning</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection3 && (
                        <View style={[styles.col2, { backgroundColor: '#025169', paddingLeft: 30 }]}>
                            <View style={[styles.row, { paddingTop: 8 }]}>

                                <View style={[styles.col4, { flex: 6, backgroundColor: '#025169' }]}>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Antall referansetekster for svaret:</Text>
                                        <TextInput
                                            style={[styles.input, { textAlign: 'right', borderRadius: 4, width: 50, paddingLeft: 10 },]}
                                            editable
                                            value={similarity_top_k}
                                            onChangeText={(text) => { if (validateInputs(text, 'similarity_top_k')) { setSimilarity_top_k(text); } }}
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>response_mode:</Text>
                                        <select style={styles.selectContainer0}
                                            value={response_mode}
                                            onChange={handleChangeResponse_mode}>
                                            <option value="refine">refine</option>
                                            <option value="compact">compact</option>
                                            <option value="tree_summarize">tree_summarize</option>
                                            <option value="simple_summarize">simple_summarize</option>
                                            <option value="accumulate">accumulate</option>
                                            <option value="compact_accumulate">compact_accumulate</option>
                                        </select>

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>similarity_cutoff:</Text>
                                        <TextInput
                                            style={[styles.input, { textAlign: 'right', borderRadius: 4, width: 50 },]}
                                            editable
                                            value={similarity_cutoff}
                                            onChangeText={(text) => { if (validateInputs(text, 'similarity_cutoff')) { setSimilarity_cutoff(text); } }}
                                        />
                                    </View>

                                </View>
                                <View style={[styles.col4, { flex: 2, backgroundColor: '#025169' }]}>



                                </View>
                            </View>
                        </View>
                    )}

                </View>

                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

        </View>
    );
}






const styles = StyleSheet.create({
    defaultStyles: {
        backgroundColor: 'red',
        padding: 20,
    },
    container: {
        alignItems: 'left',
        backgroundColor: 'red',
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'left',
        padding: 4,
    },

    row: {
        //justifyContent: 'space-between',
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },

    col: {
        flex: 1,
        width: 300,
        padding: 10,
        border: 1,
        textAlign: 'center'
    },
    col1: {
        minWidth: 50,
        maxWidth: 800,
        padding: 5,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#025169',
    },
    col2: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 10,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        //backgroundColor: '#f7f7f7',
        backgroundColor: '#ccdce1'
    },
    col3: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 3,
        border: 1,
        //textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#f7f7f7',

        //backgroundColor: '#ccdce1'
    },
    col4: {
        minWidth: 50,
        //maxWidth: 800,
        padding: 3.3,
        paddingBottom: 0,

        border: 1,
        //textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        //backgroundColor: '#f7f7f7',
        backgroundColor: '#ccdce1'
    },

    title: {
        color: '#02636c',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 5,
    },
    ingress: {
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
    },
    subtitle: {
        color: 'grey',
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        paddingLeft: 10,
    },
    roleUser: {
        fontSize: 11,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#e1efe3',
        borderRadius: 3,
        width: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
    roleAssistant: {
        fontSize: 11,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#feeedb',
        borderRadius: 3,
        width: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
    body: {
        backgroundColor: 'white',
        width: '100%',
        margin: 0,
    },
    bot: {
        fontSize: 12,
        fontWeight: 'normal',
        padding: 4,
    },
    prompt: {
        fontSize: 12,
        fontWeight: 'normal',
        //borderWidth: 0.5,
        borderColor: '#3699b6',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
    },
    input: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'center',
        //borderWidth: 1, // får feltet til å krasje..
        borderColor: 'darkgrey',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
        position: 'absolute',
        marginLeft: 220, // Space between Text and Select
    },

    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
        height: 20,
    },
    btnPress: {
        alignItems: 'center',
        backgroundColor: 'red',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
    },
    buttonText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: 'blue'
    },
    gifStyle: {
        width: 50,
        height: 25,
    },
    gifExpandStyle: {
        width: 15,
        height: 15,
    },
    seprator: {
        height: 1,
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.1)",
        marginVertical: 8, // Optional margin to add spacing around the separator
    },
    checkbox: {
        border: '1px solid white',
        position: 'absolute',
        marginLeft: 240,
    },
    selectContainer0: {
        fontSize: 12,
        position: 'absolute',
        marginLeft: 130, // Space between Text and Select
    },
    selectContainer: {
        marginTop: 3.3,
        fontSize: 12,
        marginLeft: 40, // Space between Text and Select
        width: 'fit-content', // or 'max-content'
    },

    styles: {
        fontSize: 14,
        color: 'blue',
    },

    messageContainer: {
        marginVertical: 5,
        paddingHorizontal: 10,
    },
    userHeader: {
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 5,
    },
    botHeader: {
        fontWeight: 'bold',
        color: '#34C759',
        marginBottom: 5,
    },
    messageText: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    boldText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    normalText: {
        fontSize: 12,
    },
    linkButton: {
        backgroundColor: 'grey',
        paddingVertical: 3,
        paddingHorizontal: 5,
        marginVertical: 2,
        marginRight: 5,
        borderRadius: 10,
        height: 23,
    },
    linkButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        textAlign: 'center',
    },
    markdown: {
        body: {
            fontSize: 16,
            color: '#333'
        },
        // Customize other elements as needed
    }

});


